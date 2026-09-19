# ML module (planned — Phase 6)
Principle: the production engine is a transparent weighted evidence model (backend/app/services/safety).
ML is used only where real labelled data exists, e.g.:
- **Report validation**: text classifier + duplicate detection for community reports (scikit-learn).
- **Data-quality scoring**: predicts stale/low-confidence records for moderator review.
- **Weight calibration**: only if authorized, legally obtained outcome data exists; XGBoost + SHAP for explanations.
No model is trained on invented crime statistics. Synthetic data, if used for demos, is labelled SIMULATED.
