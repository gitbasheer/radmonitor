#!/usr/bin/env python
"""Simple test endpoint for formula query integration"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
import random
from datetime import datetime

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FormulaQueryRequest(BaseModel):
    formula: str
    query: Dict[str, Any]
    time_range: str
    filters: Dict[str, Any]

@app.post("/api/v1/dashboard/formula-query")
async def execute_formula_query(request: FormulaQueryRequest):
    """Mock endpoint for formula query execution"""

    # Generate simple mock data based on formula
    formula_lower = request.formula.lower()

    if "sum" in formula_lower:
        value = random.uniform(1000, 5000)
        data = [{
            "id": "sum_1",
            "name": "Sum Result",
            "value": round(value, 2),
            "status": "normal" if value < 3000 else "warning"
        }]
    elif "average" in formula_lower or "avg" in formula_lower:
        value = random.uniform(50, 200)
        data = [{
            "id": "avg_1",
            "name": "Average Result",
            "value": round(value, 2),
            "status": "normal" if value < 100 else "critical"
        }]
    elif "count" in formula_lower:
        value = random.randint(100, 1000)
        data = [{
            "id": "count_1",
            "name": "Count Result",
            "value": value,
            "status": "normal"
        }]
    else:
        # Generic result
        data = [{
            "id": "result_1",
            "name": "Formula Result",
            "value": round(random.uniform(0, 100), 2),
            "status": "normal"
        }]

    # Simple stats
    stats = {
        "critical": sum(1 for d in data if d["status"] == "critical"),
        "warning": sum(1 for d in data if d["status"] == "warning"),
        "normal": sum(1 for d in data if d["status"] == "normal"),
        "total": len(data)
    }

    return {
        "success": True,
        "data": data,
        "stats": stats,
        "metadata": {
            "formula": request.formula,
            "timeRange": request.time_range
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    print("Starting Formula Test Server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
