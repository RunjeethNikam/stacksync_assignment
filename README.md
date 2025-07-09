# Python Sandbox API

A secure and efficient API that executes user-submitted Python scripts inside a tightly controlled environment. The code is expected to define a main() function which returns a JSON-serializable response.

## ✨ Highlights

🔒 Isolated Python execution using NsJail sandbox
🔄 Flask API with a single /execute endpoint
📤 Captures stdout and return values as part of output
🐳 Optimized Docker setup for local and cloud use
🛡️ Cloud-safe build with chroot and seccomp hardening
🧰 Supports numpy, pandas, and standard Python modules
🌐 Includes basic web IDE built in React (optional)
---

## 🚀 Local Development

To run the API locally using Docker:

```bash
docker build -t python-sandbox-api --build-arg BUILD=local .
docker run -p 8080:8080 python-sandbox-api
```

## ☁️ Running in Google Cloud Run

This project is also compatible with Cloud Run and accounts for gVisor’s syscall restrictions.

### Build with:

```bash
docker build -t python-api --build-arg BUILD=cloud .
```

### Notes on Cloud Compatibility

Cloud Run uses gVisor under the hood, which blocks certain system operations:

❌ clone(CLONE_NEWUSER), CLONE_NEWPID, etc. → Not allowed

✅ chroot() → Permitted and used for filesystem sandboxing

Instead of relying on namespace-based isolation, this implementation switches to chroot mode with a pre-bundled Python runtime and minimal libraries.

### Sandbox Design
Precompiled Python 3.11 binary and core libraries

Controlled /tmp execution directory

Read-only mounts and environment whitelisting

Seccomp filtering to block risky operations

### Seccomp Profile(Cloud Only)

```text
KILL {
  chmod, fchmod, fchmodat,
  chown, fchown, lchown,
  setuid, setgid, setreuid, setregid,
  setresuid, setresgid, setfsuid, setfsgid,
  setgroups,
  mount, umount
} DEFAULT ALLOW
```

This policy ensures no privilege escalation or filesystem tampering.


## Input Handling & Safety

Scripts are required to contain a main() function

All code is wrapped in a controlled executor before running

Output includes:
1. result: return value from main()
2. stdout: printed output
3. error and trace: if execution fails



## Optional: Web IDE Client

A frontend playground is also available to test the API in-browser. Built with:

React + Vite

CodeMirror for code editing

Lucide icons

Axios for backend integration

This provides a convenient way to test the `/execute` endpoint interactively.

> Built using React, CodeMirror, axios, and Tailwind-style UI with Lucide icons.

### ▶️ To Run the React Client Locally

```bash
cd client
npm install
npm run dev
```
Visit http://localhost:5173 in your browser.


## Sample API Usage (cURL)

#### Basic Script

```bash
curl -X POST https://<your-api>/execute \
  -H "Content-Type: application/json" \
  -d '{"script": "def main():\n    print(\"Hi!\")\n    return {\"done\": True}"}'
```
#### 🧮 NumPy Example

```bash
curl -X POST https://<your-api>/execute \
  -H "Content-Type: application/json" \
  -d '{"script": "def main():\n    import numpy as np\n    return {\"avg\": float(np.mean([1,2,3]))}"}'
```
#### Error

```bash
curl -X POST https://<your-api>/execute \
  -H "Content-Type: application/json" \
  -d '{"script": "def main():\n    import os\n    os.mkdir(\"/root\")\n    return {}"}'

```

## ⏱️ Time Spent

This project was built over the course of 15–20 focused hours, covering:

* 🔧 Designing and optimizing Docker builds for both local and cloud execution
* 🛠️ Adapting NsJail to function seamlessly in Cloud Run by accounting for gVisor limitations

* 🔒 Implementing secure Python sandboxing using chroot and restrictive seccomp rules

* 🧪 Developing a robust Flask API with layered validation and structured error reporting

* 💻 Crafting a React-based IDE to test and visualize script execution in real-time

* 🧾 Writing clear documentation and validating against various edge-case scenarios

