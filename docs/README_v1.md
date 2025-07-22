# RAD Monitor Documentation

Welcome to the RAD Monitor documentation. This document provides a comprehensive overview of the project, its architecture, and its goals.

## Project Overview

The RAD Monitor is a tool for monitoring and analyzing traffic data from a Kibana instance. It provides a dashboard for visualizing traffic trends, identifying anomalies, and scoring the health of the system.

The project is currently undergoing a migration from a collection of shell scripts to a more robust and maintainable Python-based application. The core logic is being implemented in Python, with a focus on using modern tools like FastAPI and Pydantic.

## Key Goals

*   **Real-time Monitoring:** Provide a real-time view of traffic data.
*   **Anomaly Detection:** Identify and flag unusual traffic patterns.
*   **Health Scoring:** Calculate a health score for the system based on traffic data.
*   **Maintainability:** Create a well-structured and maintainable codebase.
*   **Testability:** Ensure the codebase is well-tested and reliable.
*   **Cross-Platform Compatibility:** Ensure the application can run on different operating systems.

## Architecture

The RAD Monitor consists of the following components:

*   **Frontend:** A web-based dashboard for visualizing traffic data.
*   **Backend:** A Python-based backend that provides a FastAPI server for:
    *   Fetching data from Kibana.
    *   Processing and analyzing data.
    *   Serving the frontend.
    *   Providing a WebSocket for real-time updates.
*   **Configuration:** A centralized configuration system using a `.env` file and a Python `Config` class.
*   **Scripts:** A collection of shell and Python scripts for running, testing, and managing the application.

For a more detailed architecture diagram, see [README_graph.md](README_graph.md).

## Migration to Python

The project is in the process of migrating its core logic from shell scripts to Python. This migration is being done to improve the maintainability, testability, and cross-platform compatibility of the application.

For more details on the migration, see the following documents:

*   [BASH_SCRIPTS_ANALYSIS.md](BASH_SCRIPTS_ANALYSIS.md)
*   [BASH_TO_PYTHON_MIGRATION.md](BASH_TO_PYTHON_MIGRATION.md)

## Getting Started

To get started with the RAD Monitor, see the [WAM_LOCAL_SETUP_GUIDE.md](../WAM_LOCAL_SETUP_GUIDE.md).

## Documentation Index

For a full index of all documentation, see the old [docs/README.md](README_v1.md).
