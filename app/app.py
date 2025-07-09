from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import json
import traceback

app = Flask(__name__)
CORS(app)

CONFIG_PATH = "/etc/nsjail.cfg"
RUNNING_IN_PROD = os.environ.get("BUILD") == "cloud"
TEMP_SCRIPT_PATH = "/sandbox/tmp/script.py" if RUNNING_IN_PROD else "/tmp/script.py"

def prepare_script(code):
    return f"""
import sys, io, json, traceback

_capture = io.StringIO()
sys.stdout = _capture

{code}

if __name__ == "__main__":
    try:
        result = main()
        sys.stdout = sys.__stdout__
        output = _capture.getvalue()
        print(json.dumps({{
            "return_value": result,
            "console_log": output,
            "status_code": 0
        }}))
    except Exception as err:
        sys.stdout = sys.__stdout__
        print(json.dumps({{
            "error_msg": str(err),
            "console_log": _capture.getvalue(),
            "traceback": traceback.format_exc(),
            "status_code": 1
        }}))
"""

def is_valid_input(data):
    if not data or "script" not in data:
        return False, {"error": "Missing 'script' in request"}, 400

    script = data["script"]

    if not isinstance(script, str):
        return False, {"error": "Script must be a string"}, 400

    if not script.strip():
        return False, {"error": "Script cannot be empty"}, 400

    if "def main(" not in script:
        return False, {"error": "Expected a 'main()' function in the script"}, 400

    # Try compiling the script to catch syntax errors early
    try:
        compile(script, "<string>", "exec")
    except SyntaxError as e:
        return False, {
            "error": "Script contains syntax errors",
            "details": f"{e.__class__.__name__}: {e.msg} at line {e.lineno}"
        }, 400

    return True, script, None


def get_command_args():
    commands = ["nsjail", "--config", CONFIG_PATH]
    if RUNNING_IN_PROD:
        commands += ["--chroot", "/sandbox"]
    commands += ["--", "/usr/local/bin/python3", "/tmp/script.py"]
    return commands

@app.route("/execute", methods=["POST"])
def handle_execution():
    request_data = request.get_json()
    valid, script, code = is_valid_input(request_data)
    if not valid:
        return jsonify(script), code

    full_code = prepare_script(script)

    try:
        with open(TEMP_SCRIPT_PATH, "w") as file:
            file.write(full_code)

        proc = subprocess.run(
            get_command_args(),
            stderr=subprocess.PIPE,
            stdout=subprocess.PIPE,
            timeout=10,
            text=True
        )

        os.remove(TEMP_SCRIPT_PATH)

        try:
            output = json.loads(proc.stdout)
        except json.JSONDecodeError:
            return jsonify({
                "error": "Output is not valid JSON",
                "stdout": proc.stdout.strip(),
                "stderr": proc.stderr.strip()
            }), 400

        if "error_msg" in output:
            return jsonify({
                "stdout": output.get("console_log", "").strip(),
                "error": output["error_msg"],
                "exit_code": output.get("status_code", 1),
                "trace": output.get("traceback", "")
            }), 400

        return jsonify({
            "result": output.get("return_value"),
            "exit_code": output.get("status_code", 0),
            "stdout": output.get("console_log", "").strip()
        })

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Execution timed out"}), 408

    except Exception as ex:
        return jsonify({
            "error": "Unexpected server error",
            "details": str(ex),
            "trace": traceback.format_exc()
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
