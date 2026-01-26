from fastapi import APIRouter
import pandas as pd
from pathlib import Path

router = APIRouter()
DATA_DIR = Path(__file__).resolve().parents[2] / "data"

@router.get("/signals")
def signals():
    try:
        cleaned_dir = DATA_DIR / "cleaned"
        par = cleaned_dir / "social.parquet"
        if par.exists():
            df = pd.read_parquet(par)
        else:
            df = pd.read_csv(DATA_DIR / "social.csv", parse_dates=["date"])
        # convert rows to simple signals
        rows = []
        for i, r in df.iterrows():
            rows.append({
                "id": int(i) + 1,
                "sku": r.get("sku", "GS-019"),
                "source": r.get("source", "TikTok"),
                "velocity": int(r.get("mentions", 0)),
                "keyword": r.get("hashtag", "")
            })
        return rows
    except Exception:
        return []


@router.get("/social")
def social(hashtag: str = None, top_n: int = 10):
    """Return social rows and a small top-hashtags aggregation."""
    try:
        cleaned_dir = DATA_DIR / "cleaned"
        par = cleaned_dir / "social.parquet"
        top_path = cleaned_dir / "social_top_hashtags.json"
        if par.exists():
            df = pd.read_parquet(par)
            rows = df.to_dict(orient="records")
        else:
            df = pd.read_csv(DATA_DIR / "social.csv", parse_dates=["date"]).fillna("")
            if "hashtag" not in df.columns and "tag" in df.columns:
                df = df.rename(columns={"tag": "hashtag"})
            rows = df.to_dict(orient="records")

        # compute top hashtags (prefer precomputed file)
        if top_path.exists():
            import json

            with open(top_path, "r", encoding="utf-8") as fh:
                top = json.load(fh)
        else:
            if "hashtag" in df.columns and not df["hashtag"].empty:
                top = df["hashtag"].value_counts().head(top_n).rename_axis("hashtag").reset_index(name="count").to_dict(orient="records")
            else:
                top = []

        return {"rows": rows, "top_hashtags": top}
    except Exception:
        return {"rows": [], "top_hashtags": []}

@router.get("/sku-mappings")
def sku_mappings():
    return [
        {"sku":"GS-019","title":"Electric Kettle","score":0.92,"image":""},
        {"sku":"BL-101","title":"Blender","score":0.78,"image":""}
    ]

@router.get("/sources")
def sources():
    return [
        {"name":"TikTok","value":45,"color":"hsl(var(--chart-1))"},
        {"name":"Instagram","value":28,"color":"hsl(var(--chart-4))"},
        {"name":"Twitter/X","value":15,"color":"hsl(var(--chart-5))"},
        {"name":"Google","value":12,"color":"hsl(var(--chart-3))"}
    ]
