# Firebase Environment Configuration

## 🏗️ Architecture Overview

BarterVerse uses a **single Firebase project** (`barterverse-l9uq3`) with **multiple apps and data segregation** for different environments.

### 🎯 Firebase Apps & Hosting Sites

| Environment | Firebase App | App ID | Hosting Site | URL |
|-------------|--------------|--------|---------------|-----|
| **Production** | BarterVerse Production | `7d28acc04fda58c1d38a0e` | `barterverse-production` | https://barterverse-production.web.app |
| **Preview/Dev** | BarterVerse Auto Deploy | `acfe0e4f7fcb4fc4d38a0e` | `barterverse-auto-deploy` | https://barterverse-auto-deploy.web.app |
| **Local Dev** | BarterVerse Auto Deploy | `acfe0e4f7fcb4fc4d38a0e` | Local (port 9002) | http://localhost:9002 |

### 📊 Data Segregation Strategy

**Collection Prefixes** are used to separate data within the same Firestore database:

| Environment | Collection Prefix | Example Collections |
|-------------|------------------|-------------------|
| **Production** | *(none)* | `users`, `items`, `trades` |
| **Auto Deploy** | `dev_` | `dev_users`, `dev_items`, `dev_trades` |
| **Testing** | `test_` | `test_users`, `test_items`, `test_trades` |

### 🔧 Environment Configuration Files

```bash
.env.local          # Local development (auto-deploy app)
.env.preview        # Preview instances (auto-deploy app)  
.env.production     # Production releases (production app)
.env.development    # Development settings
```

## 🚀 How Preview Instances Work

### 1. **Environment Detection**
```javascript
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';
const firebaseEnv = process.env.NEXT_PUBLIC_FIREBASE_ENV || 'auto-deploy';
```

### 2. **Collection Routing**
Preview instances use the `auto-deploy` Firebase app with `dev_` collection prefix:
- ✅ Safe: Isolated from production data
- ✅ Shared: Multiple preview instances can share development data
- ✅ Fast: No separate project setup needed

### 3. **Firebase Security Rules**
The same security rules apply to all prefixed collections, ensuring proper access control.

## 🛠️ Development Workflows

### Local Development
```bash
# Uses .env.local
npm run dev                    # Auto-deploy app, dev_ collections
npm run firebase:emulators     # Local Firebase emulators (optional)
```

### Preview Instances  
```bash
# Uses .env.preview automatically
# Deploys to: barterverse-auto-deploy.web.app
# Data: dev_* collections
```

### Production Deployment
```bash
# Uses .env.production
# Deploys to: barterverse-production.web.app  
# Data: production collections (no prefix)
```

## 🔍 Data Management

### Seeding Development Data
```bash
npm run firebase:seed          # Seeds dev_* collections
```

### Monitoring Collections
- **Production**: `users`, `items`, `trades`
- **Development**: `dev_users`, `dev_items`, `dev_trades`
- **Testing**: `test_users`, `test_items`, `test_trades`

### Firebase Console
- **Project**: https://console.firebase.google.com/project/barterverse-l9uq3
- **Firestore**: View all collections (production and prefixed)
- **Authentication**: Shared across all apps
- **Hosting**: Multiple sites for different environments

## ⚠️ Important Notes

1. **Authentication is shared** across all environments (same project)
2. **Production data is isolated** by using no prefix
3. **Preview instances are safe** - they only touch `dev_*` collections
4. **Storage buckets are shared** but can be organized by folders
5. **Security rules apply universally** to all collection prefixes

This architecture provides:
- ✅ **Cost efficiency** (single project)
- ✅ **Data isolation** (collection prefixes)  
- ✅ **Simple deployment** (multiple hosting sites)
- ✅ **Shared authentication** (single user base)
- ✅ **Safe preview testing** (isolated dev data)