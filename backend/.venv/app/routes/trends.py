from fastapi import APIRouter
import pandas as pd
from pathlib import Path

router = APIRouter()
DATA_DIR = Path(__file__).resolve().parents[2] / "data"

@router.get("/top-hashtags")
def top_hashtags(days: int = 7, top_n: int = 10):
    df = pd.read_csv(DATA_DIR / "social.csv", parse_dates=["date"])
    cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
    df = df[df["date"] >= cutoff]
    agg = df.groupby("hashtag")["mentions"].sum().reset_index().sort_values("mentions", ascending=False)
    return agg.head(top_n).to_dict(orient="records")
