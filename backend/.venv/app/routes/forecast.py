from fastapi import APIRouter
import pandas as pd
from pathlib import Path

router = APIRouter()
DATA_DIR = Path(__file__).resolve().parents[2] / "data"

@router.get("/historic")
def historic(sku: str = "GS-019"):
    df = pd.read_csv(DATA_DIR / "historic.csv", parse_dates=["date"])
    df = df[df["sku"] == sku]
    return {"dates": df["date"].dt.strftime("%Y-%m-%d").tolist(),
            "values": df["units"].tolist()}

@router.get("/forecast")
def forecast(sku: str = "GS-019", horizon: int = 7):
    df = pd.read_csv(DATA_DIR / "historic.csv", parse_dates=["date"])
    df = df[df["sku"] == sku].sort_values("date")
    avg = df["units"].tail(7).mean() if not df.empty else 100
    dates = pd.date_range(df["date"].max() + pd.Timedelta(days=1), periods=horizon).strftime("%Y-%m-%d").tolist()
    forecast = [int(avg)] * horizon
    return {"forecast_dates": dates, "forecast": forecast}
