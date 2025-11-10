# Plated
A gamified cooking recipe app that makes cooking fun and social for young adults.

## 🎯 The Problem
Cooking is not popular among young adults due to lack of engagement and motivation.

## 💡 The Solution
Plated incorporates social media features, gamification, and influencer content to make cooking fun and rewarding.

## 🔧 How It Works
Users enter their budget and receive an optimized ingredient list with recipes designed to maximize ingredient usage and minimize waste.

## 📚 Documentation

All project documentation has been organized in the [`docs/`](docs/) directory:

- **[Setup & Development Guides](docs/guides/)** - Get started with installation and development
- **[Status Reports](docs/reports/)** - Backend and frontend analysis reports
- **[Changelogs](docs/changelogs/)** - Version history and updates

**Quick Links**:
- [Development Setup Guide](docs/guides/development-setup.md) - Start developing locally
- [Project Structure Guide](docs/guides/project-structure.md) - Understand the codebase
- [Database Connection Report](docs/reports/backend/database-connection-report.md) - Critical backend issues (Nov 10, 2025)
- [Production Readiness Report](docs/reports/frontend/production-readiness-report.md) - Frontend deployment status

## 🚀 Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend/Plated
npm install
npm run dev
```

Visit `http://localhost:5173` to access the app.

## 📊 Current Status

**Backend**: 🟡 In Development (38% production ready)
- Critical schema issues need resolution
- See [Database Connection Report](docs/reports/backend/database-connection-report.md)

**Frontend**: ✅ Production Ready (90%)
- Smart fallback system implemented
- Comprehensive testing complete
- See [Production Readiness Report](docs/reports/frontend/production-readiness-report.md)

## 🤝 Contributing

1. Check the [Project Structure Guide](docs/guides/project-structure.md) to understand the codebase
2. Follow the [Development Setup Guide](docs/guides/development-setup.md)
3. Review open issues in the issue tracker
4. Submit pull requests with clear descriptions

## 📝 Tech Stack

**Frontend**:
- React 19 + TypeScript
- Vite for build tooling
- Zustand for state management
- React Router for navigation

**Backend**:
- Flask (Python)
- SQLAlchemy ORM
- SQLite (development) / PostgreSQL (planned for production)
- Google OAuth for authentication

## 📄 License

[Add license information here]

---

For detailed documentation, see the [**docs/**](docs/) directory.
