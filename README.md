<div align="center">

# 🧑‍💼 Human Resource Management System

### A Full-Stack HRM Platform to Manage Employees, Payrolls, Attendance & HR Records

![Node.js](https://img.shields.io/badge/Node.js-18.x-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-API-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=white)

**An end-to-end Human Resource Management System — managing employee records, attendance, payrolls, and HR workflows with a clean UI and powerful backend.**

| [🐛 Report Bug](https://github.com/TanayV24/Human-Resource-Managment-System/issues) | [💡 Request Feature](https://github.com/TanayV24/Human-Resource-Managment-System/issues)

</div>

---

## ✨ Features

### 👥 Employee Management
- 🆕 **Add / Edit Employees** — name, position, contact, department, joining date etc.  
- 🧑‍💼 **Employee Directory** — view list of all employees with details  
- 📄 **Profile Management** — update personal info, generate profile summary  

### 📅 Attendance & Leave Management
- ✅ **Mark Attendance** — daily check-in / check-out  
- 🛌 **Leave Requests & Approval** — apply for leave, admin approval workflow  
- 📊 **Attendance Reports** — monthly attendance summary, absences, leave history  

### 💰 Payroll & Salary Management
- 💵 **Salary Records** — store salary details, allowances, bonuses  
- 🧾 **Pay Slip Generation** — generate payslips per employee  
- 📆 **Payroll History** — log past payments, view history  

### 🔐 Role-based Access & Admin Panel  
- 🔒 **User Authentication** — Login for admin / HR / employee roles (if implemented)  
- 🔧 **Admin Dashboard** — Manage employees, payrolls, attendance, leaves  

### 🖥️ UI & UX Features  
- 📱 **Responsive Design** — usable on desktop, tablet, mobile  
- 🎨 **Clean UI** — intuitive layout, clean design  
- ⚡ **Fast & Modular** — React + REST API + MongoDB backend  

---

## 🛠 Tech Stack

<table>
<tr>
<td width="50%" valign="top">

### Backend
- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** MongoDB / Mongoose  
- **API:** RESTful endpoints  
- **Security:** (Optional) JWT / Session Auth  

</td>
<td width="50%" valign="top">

### Frontend
- **Framework:** React (JavaScript / TypeScript)  
- **Styling:** CSS / Tailwind (or custom styling)  
- **State Management:** Hooks / Context / Redux (optional)  
- **HTTP Client:** Axios or fetch  

</td>
</tr>
</table>

---

## 📋 Prerequisites

| Tool | Version | Link |
|------|---------|------|
| 🟢 Node.js | 16.x or higher | https://nodejs.org |
| 📦 npm / yarn | Latest | Comes with Node.js |
| 🗄 MongoDB | Latest (local or Atlas) | https://mongodb.com |
| 💻 Git | Latest | https://git-scm.com |

Check versions:

```bash
node --version
npm --version
````

---

## ⚙️ Installation & Setup

### 🚀 Quick Start

**1. Clone Repository**

```bash
git clone https://github.com/TanayV24/Human-Resource-Managment-System.git
cd Human-Resource-Managment-System
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create `.env` file and set environment variables (e.g. `MONGO_URI`, `JWT_SECRET`, `PORT`).

Start backend server:

```bash
npm run dev
```

### 3. Setup Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Visit the URL shown (e.g. `http://localhost:3000`)

---

## 📁 Detailed Project Structure

```
Human-Resource-Managment-System/
│
├── backend/                       # Server-side backend
│   ├── controllers/             # API logic (employees, attendance, payroll, auth)
│   ├── models/                  # Database schema (Employee, Attendance, Payroll)
│   ├── routes/                  # API routes / endpoints
│   ├── middleware/              # Auth, validation, error handling
│   ├── config/                  # DB config, environment variables
│   ├── utils/                   # Helper functions (date utils, salary calc etc.)
│   ├── server.js / app.js      # Backend entry point
│   └── package.json            # Server dependencies & scripts
│
├── frontend/                     # Client-side React application
│   ├── public/                  # Static assets (images, icons)
│   ├── src/
│   │   ├── components/          # UI components (EmployeeList, Navbar, Profile, PayrollForm, etc.)
│   │   ├── pages/               # Page views (Dashboard, Employees, Payrolls, Login, etc.)
│   │   ├── services/            # API call abstractions
│   │   ├── context/             # State management (Auth, User, Theme etc.)
│   │   ├── assets/              # Images, icons, static media
│   │   ├── App.jsx / index.js   # Root components & routing
│   │   └── styles/              # CSS / Tailwind config
│   └── package.json            # Frontend dependencies & scripts
│
├── .gitignore
└── README.md                    # This documentation file
```

---

## 🔧 Troubleshooting & Tips

<details>
<summary>Database connection errors</summary>

* Ensure `MONGO_URI` in `.env` is correct
* Check MongoDB is running (locally or Atlas)
* Ensure backend has correct permissions and CORS (if using frontend)

</details>

<details>
<summary>Frontend deployment issues / CORS</summary>

* Verify API base URL in frontend config
* Ensure backend CORS is enabled (if frontend on different port)
* Check network tab in browser for errors

</details>

<details>
<summary>Authentication / Authorization problems</summary>

* Confirm JWT or session secrets are set
* Validate token in backend routes
* Verify roles (Admin / HR / Employee) permissions logic

</details>
