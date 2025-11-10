# Database Connection & Architecture Analysis Report

**Date**: 2025-11-10
**Branch**: `claude/review-recipe-backend-011CUzjU3GjtWHuYbGRd6xmo`
**Upstream Reference**: `BytesizeBrain/Plated` - `chau-recipe-backend` branch
**Analyst**: Claude Code Agent

---

## Executive Summary

This report analyzes the database architecture and connection strategy between the upstream `chau-recipe-backend` branch and the current fork (`Plated-Testing-CC`). The analysis reveals significant architectural divergence, schema inconsistencies, and incomplete integration of new features that require immediate attention before the code can be considered production-ready.

**Key Findings**:
- ⚠️ **Critical**: Schema type mismatches between User and Recipe models will cause runtime failures
- ⚠️ **Critical**: Missing blueprint registrations render Recipe and Tag APIs inaccessible
- ⚠️ **Major**: Architectural divergence - Upstream uses Supabase, fork uses SQLAlchemy + SQLite
- ⚠️ **Major**: Database type incompatibility - PostgreSQL UUID types used with SQLite backend

---

## 1. Upstream Branch Analysis (`chau-recipe-backend`)

### 1.1 Database Architecture

**Technology Stack**:
- **Database Platform**: Supabase (PostgreSQL-based Backend-as-a-Service)
- **Connection Method**: Direct REST API client via `supabase-py` SDK
- **Authentication**: Supabase Auth (anonymous key-based)

**Configuration** (`app.py`):
```python
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
```

### 1.2 Transitional State Evidence

The upstream branch shows signs of architectural transition or experimentation:

**Active Code Path** (`app.py`):
- Uses Supabase client directly
- No ORM layer
- REST API calls for data operations

**Inactive/Commented Code** (`extensions.py`):
```python
# ALL 34 LINES COMMENTED OUT
# - SQLAlchemy configuration (SQLite)
# - Google OAuth setup
# - Traditional Flask patterns
```

**Analysis**: The completely commented-out `extensions.py` suggests either:
1. Migration in progress from SQLAlchemy → Supabase
2. Alternative architecture template
3. Legacy code retained for reference

### 1.3 Dependencies (`requirements.txt`)

**Dual Stack Present**:

*Supabase Stack* (Active):
```
supabase==2.22.2
postgrest==2.22.2
supabase-auth==2.22.2
realtime==2.22.2
storage3==2.22.2
```

*SQLAlchemy Stack* (Dormant):
```
SQLAlchemy==2.0.44
Flask-SQLAlchemy==3.1.1
```

**Verdict**: Dependency confusion - both stacks installed but only Supabase appears active.

### 1.4 Data Models

**Status**: Minimal implementation
- ✅ `user_model.py` exists (implementation unknown)
- ❌ No recipe models found
- ❌ No tag models found

**Limitation**: Could not verify actual model implementation details from GitHub web interface.

---

## 2. Current Fork Analysis (`Plated-Testing-CC`)

### 2.1 Database Architecture

**Technology Stack**:
- **Database**: SQLite (development database)
- **ORM**: SQLAlchemy via Flask-SQLAlchemy
- **Authentication**: Google OAuth + JWT tokens

**Configuration** (`extensions.py:29-34`):
```python
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
```

**Status**: ✅ Fully implemented and active

### 2.2 Data Models Implemented

#### User Model (`backend/models/user_model.py`)

```python
class User(db.Model):
    id = db.Column(db.String(36), primary_key=True, unique=True, nullable=False)
    email = db.Column(db.String(128), nullable=False)
    username = db.Column(db.String(64), unique=True, nullable=False)
    display_name = db.Column(db.String(64), nullable=False)
    profile_pic = db.Column(db.String(256), nullable=False, default="...")

    # Self-referential relationships
    followers = db.relationship('User', secondary=followers, ...)
    sent_requests = db.relationship('User', secondary=follow_requests, ...)
```

**Association Tables**:
- `followers` - Tracks follower/following relationships
- `follow_requests` - Manages pending follow requests with timestamps

#### Recipe Model (`backend/models/recipe_model.py`)

```python
class Recipe(db.Model):
    __tablename__ = "recipes"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = db.Column(db.String(255), nullable=False)
    blurb = db.Column(db.Text)
    image_url = db.Column(db.String(1000))
    author_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=db.func.now())
    tags = db.relationship("Tag", secondary=recipe_tags, lazy="joined")
```

#### Tag Model (`backend/models/recipe_model.py`)

```python
class Tag(db.Model):
    __tablename__ = "tags"
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), unique=True, nullable=False)
```

**Association Table**:
- `recipe_tags` - Many-to-many between recipes and tags

### 2.3 API Routes Implemented

#### User Routes (`backend/routes/user_routes.py`)
- ✅ Registered in `app.py`
- Authentication, profile management, social features

#### Recipe Routes (`backend/routes/recipes.py`)
- ❌ **NOT registered in `app.py`**
- `GET /` - List/search recipes with filtering
- `POST /` - Create recipe with tags (JWT-protected)

#### Tag Routes (`backend/routes/tags.py`)
- ❌ **NOT registered in `app.py`**
- `GET /` - List all tags

### 2.4 Application Entry Point (`backend/app.py`)

```python
from routes.user_routes import users_bp

# Only users_bp is registered!
app.register_blueprint(users_bp)

@app.route('/')
def index():
    return {
        "status": "ok",
        "message": "Plated Backend API is running",
        "endpoints": {
            "health": "/health",
            "login": "/login",
            "user_profile": "/api/user/profile"
            # Recipe/Tag endpoints not listed
        }
    }, 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Will fail - see Critical Issues
    app.run(debug=True, host='0.0.0.0')
```

---

## 3. Critical Issues Identified

### 3.1 Schema Type Mismatch (CRITICAL)

**Issue**: Foreign key type incompatibility between models

**Location**:
- `user_model.py:20` - `id = db.Column(db.String(36), ...)`
- `recipe_model.py:17` - `author_id = db.Column(UUID(as_uuid=True), db.ForeignKey("users.id"), ...)`

**Impact**:
- Foreign key constraint will fail
- Database creation (`db.create_all()`) will error or create incompatible schema
- Recipe creation will fail at runtime when trying to link to User

**Root Cause**: Recipe model uses PostgreSQL-specific UUID type, User model uses generic String

**Example Failure Scenario**:
```python
# This will fail:
recipe = Recipe(author_id=user.id, ...)  # String → UUID conversion error
db.session.add(recipe)
db.session.commit()  # IntegrityError or TypeError
```

### 3.2 Database Type Incompatibility (CRITICAL)

**Issue**: PostgreSQL UUID type used with SQLite backend

**Affected Models**:
- `Recipe.id` - UUID(as_uuid=True)
- `Recipe.author_id` - UUID(as_uuid=True)
- `Tag.id` - UUID(as_uuid=True)
- `recipe_tags` association table - Both foreign keys are UUID

**SQLite Behavior**:
- SQLite does not have native UUID type
- SQLAlchemy will silently convert to CHAR(32) or BLOB
- May cause subtle bugs with UUID operations
- Foreign key relationships may fail

**Evidence**:
```python
from sqlalchemy.dialects.postgresql import UUID  # PostgreSQL-specific import!
```

### 3.3 Missing Blueprint Registrations (MAJOR)

**Issue**: Recipe and Tag APIs defined but inaccessible

**Defined but Not Registered**:
- `recipes_bp` from `routes/recipes.py`
- `tags_bp` from `routes/tags.py`

**Current State** (`app.py:16`):
```python
from routes.user_routes import users_bp
app.register_blueprint(users_bp)
# recipes_bp and tags_bp are never imported or registered
```

**Impact**:
- Recipe CRUD endpoints return 404
- Tag listing endpoint returns 404
- Frontend cannot access recipe functionality
- Significant features completely non-functional

**Test**:
```bash
curl http://localhost:5000/api/recipes  # 404 Not Found
curl http://localhost:5000/api/tags     # 404 Not Found
```

### 3.4 Incomplete Database Initialization (MAJOR)

**Issue**: `db.create_all()` will fail on first run

**Current Code** (`app.py:33-34`):
```python
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Will fail due to schema issues
    app.run(debug=True, host='0.0.0.0')
```

**Failure Points**:
1. UUID type incompatibility with SQLite
2. Foreign key type mismatch (String → UUID)
3. No error handling or migration strategy

---

## 4. Architectural Comparison

| Aspect | Upstream (`chau-recipe-backend`) | Current Fork |
|--------|----------------------------------|--------------|
| **Database** | Supabase (PostgreSQL BaaS) | SQLite (local file) |
| **ORM/Client** | Supabase REST API | SQLAlchemy ORM |
| **Authentication** | Supabase Auth (anon key) | Google OAuth + JWT |
| **Data Access** | Direct API calls | ORM queries |
| **Models** | User only (unverified) | User + Recipe + Tag |
| **Social Features** | Unknown | Followers/follow requests |
| **Schema Management** | Supabase migrations | SQLAlchemy create_all() |
| **Production Database** | PostgreSQL (via Supabase) | Not configured (SQLite only) |
| **Blueprint Registration** | Unknown | Incomplete (2 of 3) |
| **Status** | Transitional/experimental | Feature-rich but broken |

---

## 5. Feature Comparison

### 5.1 User Management

| Feature | Upstream | Current Fork |
|---------|----------|--------------|
| User profile | ✓ | ✓ |
| Authentication | Supabase Auth | Google OAuth |
| Social following | Unknown | ✓ (followers table) |
| Follow requests | Unknown | ✓ (follow_requests table) |

### 5.2 Recipe Management

| Feature | Upstream | Current Fork |
|---------|----------|--------------|
| Recipe model | ❌ | ✓ (defined) |
| Recipe CRUD API | ❌ | ✓ (defined but inaccessible) |
| Recipe search | ❌ | ✓ (title search) |
| Tag filtering | ❌ | ✓ |
| Tag management | ❌ | ✓ |

### 5.3 API Endpoints

**Current Fork** (designed but some broken):
```
✓ GET  /                          - Health check
✓ POST /login                     - Google OAuth login
✓ GET  /api/user/profile          - User profile (JWT)
✗ GET  /api/recipes               - List recipes (NOT ACCESSIBLE)
✗ POST /api/recipes               - Create recipe (NOT ACCESSIBLE)
✗ GET  /api/tags                  - List tags (NOT ACCESSIBLE)
```

---

## 6. Environment Configuration

### 6.1 Upstream Configuration (Supabase)

**Required Environment Variables** (inferred):
```
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[public-anon-key]
```

### 6.2 Current Fork Configuration

**From `.env.example`**:
```
SECRET_KEY=8f9b2c7e1a4d5e6f0b3c2a1d9e8f7c6b
CLIENT_ID=1028801421221-e10js9jjkcst0n1n4vmruk75rrvvstdp.apps.googleusercontent.com
CLIENT_SECRET=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qHax
FRONTEND_URL=http://localhost:5173
```

**Database Configuration** (hardcoded in `extensions.py`):
```python
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
```

**Security Concern**: Real OAuth credentials committed to `.env.example` - should be placeholder values.

---

## 7. Dependencies Analysis

### 7.1 Current Fork (`requirements.txt`)

```
flask
flask_sqlalchemy
python-dotenv
Authlib
Flask-OAuthlib
PyJWT
datetime          # Built-in module, should not be in requirements.txt
flask_cors
pytest
```

**Issues**:
- ❌ `datetime` should not be listed (built-in module)
- ❌ No version pinning (except found via pip freeze equivalent)
- ✅ Focused dependencies for SQLAlchemy stack
- ❌ Missing: database driver for production PostgreSQL (e.g., `psycopg2-binary`)

### 7.2 Upstream Dependencies

**Much larger stack** with version pins:
- Dual database support (Supabase + SQLAlchemy)
- More comprehensive testing tools
- Additional auth libraries
- Real-time and storage capabilities

---

## 8. Code Quality Observations

### 8.1 Positive Aspects

✅ **Well-structured routes**:
- Clean Blueprint separation
- JWT authentication decorator pattern
- Proper error handling in routes

✅ **Good model design**:
- Clear relationships (followers, tags)
- Helper methods (e.g., `Recipe.to_dict()`)
- Proper use of association tables

✅ **CORS configuration**:
- Explicitly configured for local and production origins
- Credentials support enabled

### 8.2 Areas for Improvement

⚠️ **No database migrations**:
- Using `db.create_all()` instead of Alembic/Flask-Migrate
- Schema changes will require manual intervention

⚠️ **Hardcoded database path**:
- SQLite path not configurable via environment
- No distinction between dev/test/prod databases

⚠️ **Missing error handling**:
- No try/except around `db.create_all()`
- No database connection error handling

⚠️ **No logging configuration**:
- Debug logging only via Flask debug mode
- No structured logging for production

---

## 9. Recommendations

### 9.1 Immediate Critical Fixes (Required before deployment)

#### Priority 1: Fix Schema Type Consistency

**Option A: Switch to String-based IDs (SQLite-compatible)**
```python
# recipe_model.py - Change from:
id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

# To:
import uuid
id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
author_id = db.Column(db.String(36), db.ForeignKey("user.id"), nullable=False)
```

**Option B: Migrate to PostgreSQL (Production-aligned)**
```python
# extensions.py - Add environment-based configuration:
import os
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///users.db')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL

# .env.example:
DATABASE_URL=postgresql://user:password@localhost/plated_dev
```

**Recommendation**: Option A for quick fix, Option B for long-term production readiness.

#### Priority 2: Register Missing Blueprints

**Fix** (`app.py`):
```python
# Add imports
from routes.user_routes import users_bp
from routes.recipes import recipes_bp
from routes.tags import tags_bp

# Register all blueprints
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(recipes_bp, url_prefix='/api/recipes')
app.register_blueprint(tags_bp, url_prefix='/api/tags')
```

#### Priority 3: Add Database Migration Support

```bash
pip install Flask-Migrate
```

**New migration setup** (`extensions.py`):
```python
from flask_migrate import Migrate

migrate = Migrate(app, db)
```

**Initialize migrations**:
```bash
flask db init
flask db migrate -m "Initial schema"
flask db upgrade
```

### 9.2 Short-term Improvements (Next sprint)

1. **Environment-based configuration**:
   - Move database URI to environment variable
   - Support dev/test/prod configurations
   - Remove hardcoded secrets from `.env.example`

2. **Add comprehensive error handling**:
   - Database connection failures
   - Constraint violations
   - API error responses

3. **Testing setup**:
   - Unit tests for models
   - Integration tests for routes
   - Test database configuration

4. **Documentation**:
   - API endpoint documentation (OpenAPI/Swagger)
   - Database schema documentation
   - Setup instructions for new developers

### 9.3 Long-term Architecture Decision (Strategic)

**Critical Question**: Should this fork align with upstream or continue diverging?

#### Option 1: Align with Upstream (Supabase)

**Pros**:
- Easier to merge upstream changes
- BaaS features (auth, storage, real-time)
- Managed database infrastructure
- Built-in admin panel

**Cons**:
- Vendor lock-in
- Current SQLAlchemy models need rewrite
- Learning curve for Supabase patterns
- Potential cost implications

#### Option 2: Continue SQLAlchemy Path

**Pros**:
- More control over database
- Standard Python patterns
- Already implemented
- No vendor lock-in

**Cons**:
- Diverges from upstream
- More infrastructure management
- Must implement auth/storage separately
- Merge conflicts on future upstream pulls

#### Option 3: Hybrid Approach

**Use SQLAlchemy with PostgreSQL**:
- Compatible with both approaches
- Can use Supabase-hosted PostgreSQL
- Maintain ORM while gaining managed DB
- Easier migration path in either direction

**Recommendation**: Option 3 - Migrate to PostgreSQL with SQLAlchemy, optionally using Supabase as database host.

---

## 10. Migration Strategy

### Phase 1: Critical Bug Fixes (1-2 days)

1. ✅ Align User.id type with Recipe.author_id (both String(36))
2. ✅ Change UUID columns to String(36) throughout
3. ✅ Register recipes_bp and tags_bp in app.py
4. ✅ Test database creation and basic CRUD operations

### Phase 2: Database Infrastructure (3-5 days)

1. ✅ Add Flask-Migrate for schema migrations
2. ✅ Environment-based database configuration
3. ✅ Set up PostgreSQL for local development
4. ✅ Create initial migration
5. ✅ Update documentation

### Phase 3: Testing & Validation (2-3 days)

1. ✅ Write model unit tests
2. ✅ Write API integration tests
3. ✅ Test migration rollback scenarios
4. ✅ Load testing with realistic data volumes

### Phase 4: Production Readiness (1 week)

1. ✅ Production database setup (PostgreSQL)
2. ✅ Deployment configuration
3. ✅ Monitoring and logging
4. ✅ Backup strategy
5. ✅ Security audit

---

## 11. Testing Checklist

### Database Connection Tests

- [ ] Database creates successfully on first run
- [ ] All models create tables without errors
- [ ] Foreign key constraints work correctly
- [ ] Cascade deletes function properly
- [ ] Association tables correctly link entities

### API Functionality Tests

**User Routes**:
- [ ] Google OAuth login flow
- [ ] JWT token generation and validation
- [ ] Profile retrieval
- [ ] Follow/unfollow functionality
- [ ] Follow request acceptance/rejection

**Recipe Routes** (after blueprint registration):
- [ ] List all recipes
- [ ] Search recipes by title
- [ ] Filter recipes by tag
- [ ] Create recipe (authenticated)
- [ ] Tag association on recipe creation

**Tag Routes** (after blueprint registration):
- [ ] List all tags
- [ ] Tags ordered alphabetically
- [ ] Newly created tags appear in list

### Integration Tests

- [ ] Recipe creation creates/links tags correctly
- [ ] User can only see their own recipes
- [ ] Recipe deletion cascades to recipe_tags
- [ ] Foreign key constraints prevent orphaned records

---

## 12. Security Considerations

### Current Security Issues

1. **Real OAuth credentials in `.env.example`**:
   - Should be placeholder values
   - Risk of accidental commit to public repos

2. **No rate limiting**:
   - API endpoints vulnerable to abuse
   - No request throttling implemented

3. **Debug mode enabled**:
   - `app.run(debug=True)` exposes stack traces
   - Should be environment-dependent

4. **No input validation**:
   - SQL injection risk (mitigated by ORM)
   - XSS risk on user-generated content
   - File upload vulnerabilities (if implemented)

### Recommended Security Enhancements

```python
# Add rate limiting
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=lambda: request.headers.get('Authorization', 'anonymous')
)

@recipes_bp.post("/")
@limiter.limit("10 per minute")
@jwt_required
def create_recipe():
    # ...
```

---

## 13. Performance Considerations

### Current Performance Issues

1. **No database connection pooling configured**:
   - Using SQLAlchemy defaults
   - May cause connection exhaustion under load

2. **No query optimization**:
   - N+1 query risk on relationships
   - No pagination on list endpoints (50 item limit is hardcoded)

3. **No caching layer**:
   - Every request hits database
   - Repeated queries for same data

### Recommended Optimizations

```python
# Connection pooling
app.config['SQLALCHEMY_POOL_SIZE'] = 10
app.config['SQLALCHEMY_MAX_OVERFLOW'] = 20
app.config['SQLALCHEMY_POOL_TIMEOUT'] = 30

# Query optimization
@recipes_bp.get("/")
def list_recipes():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    query = Recipe.query.options(
        db.joinedload(Recipe.tags)  # Eager load to prevent N+1
    )

    pagination = query.paginate(page=page, per_page=per_page)
    return jsonify({
        "recipes": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages
    }), 200
```

---

## 14. Conclusion

### Current State Summary

The current fork has **more advanced features** than the upstream branch (recipe management, tags, social following) but suffers from **critical implementation bugs** that prevent deployment:

**Blockers**:
1. 🔴 Schema type mismatches causing database creation failures
2. 🔴 Missing blueprint registrations making 2/3 of APIs inaccessible
3. 🟡 SQLite/PostgreSQL UUID incompatibility

**Strengths**:
1. ✅ Well-architected SQLAlchemy models
2. ✅ Comprehensive social features (followers, requests)
3. ✅ Clean route separation and JWT auth
4. ✅ Recipe/tag functionality designed and implemented

### Readiness Assessment

| Aspect | Status | Readiness |
|--------|--------|-----------|
| Database Connection | ⚠️ Works but schema issues | 40% |
| User Management | ✅ Functional | 90% |
| Recipe Management | 🔴 Defined but inaccessible | 30% |
| Tag Management | 🔴 Defined but inaccessible | 30% |
| Authentication | ✅ Functional | 85% |
| Testing | 🔴 No tests present | 0% |
| Documentation | 🟡 Minimal | 20% |
| Production Config | 🔴 SQLite only | 10% |
| **Overall** | 🔴 Not production ready | **38%** |

### Recommended Path Forward

**Immediate** (This Sprint):
1. Fix schema type consistency (2 hours)
2. Register missing blueprints (30 minutes)
3. Test all endpoints end-to-end (2 hours)

**Short-term** (Next Sprint):
1. Add Flask-Migrate (1 day)
2. Set up PostgreSQL locally (1 day)
3. Write comprehensive tests (3 days)

**Long-term** (Next Quarter):
1. Decide on upstream alignment strategy
2. Production infrastructure setup
3. Security hardening
4. Performance optimization

### Risk Assessment

**High Risk**:
- Deploying current code will fail immediately due to schema issues
- Data loss risk without proper migrations
- Security vulnerabilities (debug mode, no rate limiting)

**Medium Risk**:
- Architectural divergence from upstream creates merge conflicts
- No rollback strategy for database changes
- Missing monitoring/alerting

**Low Risk**:
- SQLAlchemy is production-proven
- OAuth integration is standard
- Flask ecosystem is mature

---

## 15. Questions for Senior Engineer Review

1. **Architecture Decision**: Should we align with upstream's Supabase approach or continue with SQLAlchemy?

2. **Database Choice**: SQLite for development convenience or PostgreSQL for production parity?

3. **UUID Strategy**: Convert all UUIDs to String(36) for simplicity, or migrate to PostgreSQL for native UUID support?

4. **Upstream Synchronization**: How often should we sync with upstream? Is maintaining a fork long-term viable?

5. **Testing Priority**: Should we fix critical bugs first or write tests before fixing?

6. **Migration Timeline**: What's the acceptable timeline for production readiness?

7. **Security Posture**: What security requirements must be met before deployment?

8. **Performance Requirements**: Expected load and response time SLAs?

---

## Appendix A: File Structure

```
backend/
├── app.py                    # Main application entry point
├── extensions.py             # Flask app & database initialization
├── requirements.txt          # Python dependencies
├── .env.example             # Environment variable template
├── models/
│   ├── user_model.py        # User, followers, follow_requests
│   └── recipe_model.py      # Recipe, Tag, recipe_tags
├── routes/
│   ├── user_routes.py       # User API endpoints (registered ✓)
│   ├── recipes.py           # Recipe API endpoints (NOT registered ✗)
│   └── tags.py              # Tag API endpoints (NOT registered ✗)
├── static/
│   └── js/main.js
├── templates/
│   └── (HTML templates)
└── tests/
    └── (No tests present)
```

---

## Appendix B: Database Schema

### Current Schema (if db.create_all() worked)

```sql
-- Users table
CREATE TABLE user (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(128) NOT NULL,
    username VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    profile_pic VARCHAR(256) NOT NULL
);

-- Followers association (many-to-many)
CREATE TABLE followers (
    follower_id VARCHAR(36) REFERENCES user(id),
    followed_id VARCHAR(36) REFERENCES user(id),
    PRIMARY KEY (follower_id, followed_id)
);

-- Follow requests
CREATE TABLE follow_requests (
    requester_id VARCHAR(36) REFERENCES user(id),
    target_id VARCHAR(36) REFERENCES user(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (requester_id, target_id)
);

-- Recipes (BROKEN - UUID vs String mismatch)
CREATE TABLE recipes (
    id UUID PRIMARY KEY,  -- SQLite doesn't support this natively!
    title VARCHAR(255) NOT NULL,
    blurb TEXT,
    image_url VARCHAR(1000),
    author_id UUID REFERENCES users(id),  -- MISMATCH: users.id is VARCHAR(36)!
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tags
CREATE TABLE tags (
    id UUID PRIMARY KEY,  -- SQLite doesn't support this natively!
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Recipe-Tag association
CREATE TABLE recipe_tags (
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, tag_id)
);
```

---

## Appendix C: Quick Start After Fixes

```bash
# 1. Set up environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# 2. Configure environment
cp .env.example .env
# Edit .env with real credentials

# 3. Initialize database (after fixes applied)
python app.py  # Runs db.create_all() on startup

# 4. Test endpoints
curl http://localhost:5000/                    # Health check
curl http://localhost:5000/api/recipes         # After blueprint fix
curl http://localhost:5000/api/tags           # After blueprint fix
```

---

**Report Generated**: 2025-11-10
**Branch Analyzed**: `claude/review-recipe-backend-011CUzjU3GjtWHuYbGRd6xmo`
**Status**: Ready for Senior Engineer Review
