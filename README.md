# EmailPro — Full-Stack Modern Email Platform

EmailPro is a full-stack email web application inspired by Gmail, designed with a clean **white-and-blue UI/UX aesthetic**. Built with **Angular (Frontend)**, **ASP.NET Core Web API in C# (Backend)**, and **MongoDB (Database)**, it provides real email sending via SMTP, incoming email syncing via IMAP, and support for inbound webhooks.

---

## 📸 Features & Highlights

- **Gmail-Inspired White & Blue Aesthetic**: Modern typography (Plus Jakarta Sans & Inter), soft blue accents, subtle shadows, and responsive layout.
- **Strict Minimal Sidebar**: Contains **Compose**, **Inbox** (with live unread badge), and **Sent** only.
- **Top Bar**: Search bar with real-time filtering, live IMAP Sync button, and User Profile dropdown with custom settings status.
- **Inbox & Sent Mailbox**: Displays sender/recipient, subject, preview snippet, formatted date, read/unread status, and delivery badges.
- **Floating Compose Modal**: Gmail-style compose window with support for `To`, `Cc`, `Bcc`, `Subject`, message body, attachment uploading (with base64 conversion & file size checking), and prominent blue **Send** button.
- **Full Email Reader**: Complete email view with sanitized body, attachment downloads, and one-click **Reply** and **Forward** actions with quoted thread history.
- **Real SMTP Sending**: Integrated with **MailKit** for real SSL/TLS SMTP transmission to Gmail, Outlook, Yahoo, and corporate domains.
- **Real IMAP Inbound Sync**: Connects to your external IMAP server (e.g. `imap.gmail.com:993`) to pull recent incoming emails directly into your MongoDB Inbox.
- **Inbound Webhook Support**: Built-in webhook receiver (`POST /api/emails/inbound`) compatible with SendGrid Inbound Parse, Mailgun Routes, and Postmark.
- **Internal User-to-User Delivery**: Automatic instant routing between registered local EmailPro users.
- **Transparent Delivery Status**: Accurately reports `"Sent"`, `"Received"`, and `"Failed"` with specific diagnostic error messages instead of pretending an integration worked.

---

## 🏗️ Architecture & Tech Stack

```
emailpro/
├── frontend/                     # Angular Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── login/        # Auth & Registration screen with Demo button
│   │   │   │   ├── top-nav/      # Top header with search & profile menu
│   │   │   │   ├── sidebar/      # Compose, Inbox, and Sent only
│   │   │   │   ├── email-list/   # Inbox and Sent list views with search & actions
│   │   │   │   ├── email-detail/ # Email reader, reply/forward, attachments
│   │   │   │   ├── compose-modal/# Gmail-style floating compose window
│   │   │   │   ├── settings-modal# SMTP & IMAP configuration dialog
│   │   │   │   ├── toast-container# Toast notification container
│   │   │   │   └── main-layout/  # Application shell
│   │   │   ├── guards/           # AuthGuard
│   │   │   ├── interceptors/     # JWT AuthInterceptor
│   │   │   ├── models/           # TypeScript interfaces (User, Email, Attachment)
│   │   │   └── services/         # AuthService, EmailService, ToastService
│   │   └── styles.css            # White-and-blue design system & tokens
├── backend/                      # ASP.NET Core Web API (C#)
│   ├── Controllers/
│   │   ├── AuthController.cs     # Register, Login, Me, Settings endpoints
│   │   └── EmailsController.cs   # Mailbox, Send, Reply, Forward, Star, Delete, IMAP Sync, Webhook
│   ├── Data/
│   │   └── MongoDbContext.cs     # MongoDB connection & indexes
│   ├── DTOs/
│   │   ├── AuthDTOs.cs
│   │   └── EmailDTOs.cs
│   ├── Models/
│   │   ├── User.cs               # User document with credentials & custom SMTP/IMAP
│   │   ├── EmailMessage.cs       # Email document with attachments & delivery status
│   │   ├── EmailAddress.cs
│   │   └── EmailAttachment.cs
│   ├── Services/
│   │   ├── AuthService.cs        # BCrypt hashing & JWT token generation
│   │   ├── EmailService.cs       # MailKit SMTP client, IMAP client, MongoDB repository
│   │   ├── IAuthService.cs
│   │   └── IEmailService.cs
│   ├── appsettings.json          # Database, JWT, and SMTP settings
│   └── Program.cs                # DI, JWT middleware, CORS policy
└── .env.example                  # Template for configuration & environment variables
```

---

## 🚀 Getting Started

### Prerequisites

- **.NET 10 SDK** (or .NET 8+)
- **Node.js** (v18+) and **npm**
- **MongoDB** running locally on port `27017` (or MongoDB Atlas connection string)

---

### Step 1: Start MongoDB
Ensure MongoDB is running on your system:
```powershell
Get-Service -Name MongoDB
# If stopped:
Start-Service -Name MongoDB
```
*Default connection string:* `mongodb://127.0.0.1:27017`

---

### Step 2: Start the ASP.NET Core Backend
From the root directory:
```powershell
cd backend
dotnet run --urls "http://localhost:5258"
```
The API will be available at:
- **Base URL**: `http://localhost:5258`
- **OpenAPI / Swagger**: `http://localhost:5258/openapi/v1.json`

---

### Step 3: Start the Angular Frontend
In a separate terminal:
```powershell
cd frontend
npm start
```
Open your browser and navigate to:
```
http://localhost:4200
```

---

## 🔑 Quick Sign-In (Demo Account)

A demo account is pre-registered in MongoDB for instant testing:
- **Email**: `testuser@emailpro.local`
- **Password**: `Password123!`

Or click the **"Use Demo Account"** button on the login screen to autofill and sign in with a single click!

---

## ⚙️ Configuring Real Email Sending & Receiving

### 1. Outgoing SMTP (e.g. Gmail)
To send emails to real Gmail, Outlook, or external addresses:
1. Sign in to EmailPro.
2. Click your avatar in the top right -> **Mail Settings (SMTP / IMAP)**.
3. Under the **SMTP Sending** tab:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Use SSL / STARTTLS**: Checked
   - **Username**: Your full Gmail address
   - **Password**: Your 16-character **Google App Password** *(see guide below)*
   - **From Email**: Your Gmail address
   - **Sender Name**: Your Name
4. Click **Save Mail Settings**.

> **How to create a Gmail App Password:**
> 1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
> 2. Ensure **2-Step Verification** is turned ON.
> 3. Search for **"App passwords"** in the top search bar.
> 4. Enter a name (e.g., `EmailPro`) and click **Create**.
> 5. Copy the 16-letter password and paste it into EmailPro.

### 2. Incoming IMAP Sync
To fetch real incoming emails from your external email provider:
1. Open **Mail Settings** -> **IMAP Inbound Sync** tab.
2. Enter:
   - **Host**: `imap.gmail.com`
   - **Port**: `993`
   - **Use SSL**: Checked
   - **Username & App Password**: Same as above
3. Click **Save Mail Settings**.
4. Click the **"Sync Mail"** button in the top navigation to download your latest incoming messages!

### 3. Inbound Webhook (SendGrid, Mailgun, Postmark)
Point your webhook provider to:
```http
POST http://localhost:5258/api/emails/inbound
Content-Type: application/json
```
Incoming messages matching a registered user's email will automatically appear in their Inbox.

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user, hashes password via BCrypt, generates JWT |
| `POST` | `/api/auth/login` | Authenticate user, returns JWT token & profile |
| `GET` | `/api/auth/me` | Get currently authenticated user profile |
| `PUT` | `/api/auth/settings` | Update custom SMTP and IMAP settings |

### Mailbox & Messages (`/api/emails`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/emails?folder=inbox&search=...` | List messages with pagination, search & unread filter |
| `GET` | `/api/emails/counts` | Get unread inbox count and sent total |
| `GET` | `/api/emails/{id}` | Read email details & auto-mark as read |
| `POST` | `/api/emails/send` | Send email via SMTP & store in Sent folder |
| `POST` | `/api/emails/{id}/reply` | Reply to email with quoted thread & In-Reply-To |
| `POST` | `/api/emails/{id}/forward` | Forward email with attachment preservation |
| `PATCH` | `/api/emails/{id}/read` | Mark message as read/unread |
| `POST` | `/api/emails/{id}/star` | Toggle star status |
| `DELETE` | `/api/emails/{id}` | Delete message |
| `GET` | `/api/emails/{id}/attachments/{attId}` | Download attachment file |
| `POST` | `/api/emails/sync-imap` | Trigger live IMAP inbound email sync |
| `POST` | `/api/emails/inbound` | Inbound webhook receiver |

---

## 🔒 Security Best Practices
- Passwords hashed using **BCrypt.Net-Next**.
- Stateless authentication using **HMAC SHA-256 JWT tokens**.
- Server-side mailbox authorization ensures users can only access their own documents.
- MongoDB compound indexing on `(userId, folder, createdAt)` ensures optimal query performance.
- Sensitive SMTP/IMAP credentials stored securely per user and never exposed in public responses.
