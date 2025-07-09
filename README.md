# Python Script Execution API

This project provides a secure API service that allows users to execute arbitrary Python scripts by submitting them via an HTTP POST request. The script must define a `main()` function that returns a JSON-compatible Python object.

## ✨ Features

- ✅ Execute arbitrary Python scripts in a controlled sandbox
- ✅ Flask-based HTTP API with `/execute` endpoint
- ✅ Output includes both return value and captured `stdout`
- ✅ Lightweight local runtime (437MB)
- ✅ Hardened Cloud Run deployment (735MB)
- ✅ Uses **NsJail** for isolation with custom seccomp filters and chroot
- ✅ Supports `os`, `pandas`, and `numpy`
- ✅ Includes separate configurations for local and cloud environments

---

## 🚀 How to Run Locally

Build and run the Docker container with local sandboxing:

```bash
docker build -t python-api --build-arg BUILD=local .
docker run -p 8080:8080 python-api
```

## ☁️ Cloud Run Deployment

This project includes a **Cloud Run-compatible version** of NsJail using a custom patch to bypass gVisor restrictions (e.g., `PR_SET_SECUREBITS`).

### Build with:

```bash
docker build -t python-api --build-arg BUILD=cloud .
```

### Why Two Builds?

#### The gVisor Reality

Google Cloud Run uses gVisor as its container runtime sandbox, which has specific restrictions on system calls. Contrary to common assumptions, gVisor does not block chroot operations. Instead, it restricts more powerful namespace operations:

- ❌ clone(CLONE_NEWUSER) - Blocked (user namespace creation)
- ❌ clone(CLONE_NEWNET) - Blocked (network namespace creation)
- ❌ clone(CLONE_NEWPID) - Blocked (PID namespace creation)
- ✅ chroot() - Allowed (filesystem root change)

#### Why chroot Was Chosen

Since gVisor blocks the more robust namespace isolation mechanisms that tools like NsJail typically rely on, chroot became the viable sandboxing approach:

 Traditional Approach (Blocked on Cloud Run)

```bash
nsjail --user_ns --net_ns --pid_ns --chroot /sandbox
```

Cloud Run Compatible Approach

```bash
chroot /sandbox /usr/bin/python3 script.py
```

#### Implementation Details

NsJail Modifications

- 🛠️ Patched NsJail to disable securebits checks that prevent chroot in restricted environments
- 📦 Simplified sandboxing strategy to work within gVisor's constraints

Bundled Runtime Environment

- 🐍 Full Python 3.11 runtime included in /sandbox
- 📚 Minimal shared libraries for isolated execution
- 🔒 Read-only filesystem for additional security

Image Size Impact

- 🏠 Local image: ~437MB (relies on host system libraries)
- ☁️ Cloud image: ~735MB (includes complete isolated runtime)

Security Benefits
Even with the simpler chroot approach, the sandboxing provides:

- Filesystem isolation - Code cannot access files outside /sandbox
- Library isolation - Uses only bundled, controlled dependencies
- Read-only environment - Prevents filesystem modifications
- gVisor additional protection - Hardware-level isolation from Cloud Run

#### Summary (TLDR)

The choice of chroot over user namespaces wasn't a limitation—it was an adaptation to gVisor's security model. By understanding what gVisor actually blocks (namespace creation, not chroot), I created a Cloud Run-compatible sandboxing solution that maintains security while working within the platform's constraints.

### Seccomp Profile

For the **cloud variant**, the following system calls are explicitly blocked using a restrictive seccomp policy:

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

This ensures:

- 🚫 **No permission changes** (`chmod`, `chown`, etc.)
- 🔐 **No UID/GID escalation** (`setuid`, `setgid`, etc.)
- 🧱 **No mounting or unmounting** of filesystems



## ✅ Input Validation & Security

- Basic input validation ensures the script is a string and defines a `main()` function that returns JSON.
- All script executions are sandboxed using **NsJail**, making the system robust against malicious or unsafe code.

## 💻 React Client (Optional UI)

To demonstrate frontend integration and highlight my React skills, I’ve also built a simple **React-based IDE-style client** that lets users:

- Edit and run Python code in a browser
- Toggle between light/dark themes
- Configure the Cloud Run endpoint dynamically
- View structured JSON output from the API

This provides a convenient way to test the `/execute` endpoint interactively.

> Built using React, CodeMirror, axios, and Tailwind-style UI with Lucide icons.

### ▶️ To Run the React Client Locally

```bash
cd client
npm install
npm run dev
```
Then open http://localhost:5173 in your browser.

![image](https://github.com/user-attachments/assets/d4a2fab4-de12-467d-aac7-8b230bfdfe92)


## 📎 Example cURL Requests

You can quickly test the API using the following commands:

#### ▶️ Basic Script

```bash
curl -X POST https://python-api-378367989398.us-central1.run.app/execute \
  -H "Content-Type: application/json" \
  -d '{
    "script": "def main():\n    print(\"Hello from IDE\")\n    return {\"status\": \"ok\"}"
  }'
```
#### 🧮 NumPy Example

```bash
curl -X POST https://python-api-378367989398.us-central1.run.app/execute \
  -H "Content-Type: application/json" \
  -d '{
    "script": "def main():\n    import numpy as np\n    arr = np.array([1, 2, 3, 4, 5])\n    return {\"mean\": float(np.mean(arr))}"
  }'
```
#### 🚫 `os.mkdir()` Example (Expected to Fail)

```bash
curl -X POST https://python-api-378367989398.us-central1.run.app/execute \
  -H "Content-Type: application/json" \
  -d '{
    "script": "def main():\n    import os\n    os.mkdir(\"/should_fail\")\n    return {\"status\": \"created\"}"
  }'
```

## ⏱️ Time Spent

As a benchmark, this take-home challenge took approximately **7–8 hours** to complete, including:

- Docker image creation and optimization for both local and Cloud Run environments  
- Custom patching of NsJail for Cloud Run compatibility (gVisor workaround)  
- Setting up secure Python sandboxing with `chroot` and `seccomp`  
- Building the Flask API with input validation and robust error handling  
- Creating a React-based frontend to test and demonstrate the API interactively  
- Writing documentation and testing edge cases for safety


## 🙏 Final Note

Thank you for reviewing my submission. I’ve put genuine effort into building a secure, functional, and user-friendly solution that reflects both backend and frontend development skills.

I’m excited about the opportunity to contribute, learn, and grow — and I truly hope for a positive response and a chance to prove my capabilities as part of your team.
