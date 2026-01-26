from fastapi import APIRouter
import pandas as pd
from pathlib import Path
import numpy as np

router = APIRouter()
DATA_DIR = Path(__file__).resolve().parents[2] / "data"


@router.get("/historic")
def historic(sku: str = "GS-019"):
    cleaned_dir = DATA_DIR / "cleaned"
    par_path = cleaned_dir / "historic.parquet"
    if par_path.exists():
        df = pd.read_parquet(par_path).sort_values("date")
    else:
        df = pd.read_csv(DATA_DIR / "historic.csv", parse_dates=["date"]).sort_values("date")
    df = df[df["sku"] == sku]
    return {
        "dates": df["date"].dt.strftime("%Y-%m-%d").tolist(),
        "values": df["units"].tolist(),
    }


@router.get("/forecast")
def forecast(sku: str = "GS-019", horizon: int = 7):
    """Simple baseline forecast: rolling mean of recent window + confidence band.

    Returns: forecast_dates, forecast, lower, upper, and optional mae (if holdout available)
    """
    df = pd.read_csv(DATA_DIR / "historic.csv", parse_dates=["date"]).sort_values("date")
    df = df[df["sku"] == sku]
    if df.empty:
        # default placeholder
        start = pd.Timestamp.now().normalize()
        dates = pd.date_range(start + pd.Timedelta(days=1), periods=horizon).strftime("%Y-%m-%d").tolist()
        return {"forecast_dates": dates, "forecast": [100] * horizon, "lower": [80] * horizon, "upper": [120] * horizon}

    values = df["units"].astype(float)
    window = min(28, len(values))
    recent = values.tail(window)
    point = recent.mean()
    std = recent.std(ddof=0) if len(recent) > 1 else max(1.0, point * 0.1)
    # 95% conf band (approx)
    lower = point - 1.96 * std
    upper = point + 1.96 * std

    last_date = df["date"].max()
    dates = pd.date_range(last_date + pd.Timedelta(days=1), periods=horizon).strftime("%Y-%m-%d").tolist()
    forecast_vals = [int(round(point)) for _ in range(horizon)]
    lower_vals = [int(max(0, round(lower))) for _ in range(horizon)]
    upper_vals = [int(round(upper)) for _ in range(horizon)]

    # quick holdout MAE: if we have > (window*1.5) days, use last 7 as holdout
    mae = None
    if len(values) >= 14:
        holdout = values.tail(7)
        train_est = values[:-7].tail(7).mean() if len(values[:-7]) >= 1 else values.mean()
        preds = [train_est] * len(holdout)
        mae = float(np.mean(np.abs(holdout.values - np.array(preds))))

    return {
        "forecast_dates": dates,
        "forecast": forecast_vals,
        "lower": lower_vals,
        "upper": upper_vals,
        "mae": mae,
    }
