# RAD Traffic Monitor Architecture

A simplified view of the monitoring dashboard architecture for Zoom presentations.

```mermaid
flowchart TB
    %% Main Components - Simplified for Zoom
    UI["User Interface<br/>Dashboard + Auth + Query Builder"]

    CORE["Core System<br/>API + Data Processing + Config"]

    BACKEND["Backend<br/>FastAPI + CORS Proxy"]

    EXTERNAL["Kibana/Elasticsearch<br/>RAD Event Data"]

    AI["AI Assistant<br/>Query Help + Formula Builder"]

    %% Simple Flow
    UI --> CORE
    CORE --> BACKEND
    BACKEND --> EXTERNAL
    AI --> UI

    %% Styling - Bigger boxes for Zoom
    classDef ui fill:#e3f2fd,stroke:#1565c0,stroke-width:4px,rx:15,ry:15
    classDef core fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,rx:15,ry:15
    classDef backend fill:#e8f5e9,stroke:#2e7d32,stroke-width:3px,rx:15,ry:15
    classDef external fill:#fff3e0,stroke:#ef6c00,stroke-width:3px,rx:15,ry:15
    classDef ai fill:#fce4ec,stroke:#c2185b,stroke-width:3px,rx:15,ry:15

    class UI ui
    class CORE core
    class BACKEND backend
    class EXTERNAL external
    class AI ai
```

## Key Components

### Frontend
- **Dashboard**: Real-time RAD card traffic visualization
- **Auth Modal**: Kibana cookie synchronization
- **Formula Builder**: Natural language to query translation

### Core System
- **API Client**: Unified interface for all data requests
- **Data Layer**: Processes and formats RAD metrics
- **Config Manager**: Centralized settings management

### Backend Services
- **FastAPI Server**: Python backend for data processing
- **CORS Proxy**: Netlify function to bypass CORS restrictions

### External Systems
- **Kibana**: Source of RAD card event data
- **Elasticsearch**: Direct metrics queries

### AI
- **MCP Services**: 6 AI modules for enhanced functionality
- **Formula AI**: Helps users build complex queries easily

## Quick Stats
- **Total Files**: ~290 (excluding dependencies)
- **Languages**: JavaScript, Python, TypeScript
- **Test Coverage**: 50+ test files
- **Deployment**: GitHub Pages for now

## Benefits for RAD Monitoring
1. **Real-time Visibility** - Instant alerts for traffic drops
2. **Easy Querying** - No Kibana syntax knowledge required
3. **Direct Integration** - Seamless Kibana/ES connection
4. **AI Assistance** - Smart query building and suggestions
