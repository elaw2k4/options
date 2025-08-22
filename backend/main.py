from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

app = FastAPI(title="Options P&L API", version="1.0.0")

# Allow frontend to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Root endpoint ----------
@app.get("/")
def read_root():
    return {"message": "Options Profit & Loss API is running", "version": "1.0.0"}


class PnLRequest(BaseModel):
    units: int = Field(..., gt=0)
    buy_price: float = Field(..., gt=0)
    current_price: Optional[float] = None
    percent_increase: Optional[float] = None

    @model_validator(mode="after")
    def validate_one_of(cls, values):
        cp, pct = values.get("current_price"), values.get("percent_increase")
        if cp is None and pct is None:
            raise ValueError("Provide either current_price or percent_increase")
        if cp is not None and pct is not None:
            raise ValueError("Provide only one of current_price or percent_increase")
        return values


class PnLRow(BaseModel):
    sold: int
    revenue: float
    total_cost: float
    pnl: float


class PnLResponse(BaseModel):
    units: int
    buy_price: float
    current_price: float
    total_cost: float
    break_even_unit: Optional[int]
    rows: List[PnLRow]


@app.post("/pnl", response_model=PnLResponse)
def compute_pnl(req: PnLRequest):
    # Determine current price
    if req.current_price is not None:
        current_price = req.current_price
    else:
        current_price = req.buy_price * (1 + req.percent_increase / 100)
        if current_price <= 0:
            raise HTTPException(status_code=400, detail="Invalid percent increase")

    total_cost = req.units * req.buy_price
    rows: List[PnLRow] = []
    break_even_unit: Optional[int] = None

    for sold in range(1, req.units + 1):
        revenue = sold * current_price
        pnl = revenue - total_cost
        rows.append(
            PnLRow(
                sold=sold,
                revenue=round(revenue, 2),
                total_cost=round(total_cost, 2),
                pnl=round(pnl, 2),
            )
        )
        if break_even_unit is None and pnl >= 0:
            break_even_unit = sold

    return PnLResponse(
        units=req.units,
        buy_price=round(req.buy_price, 4),
        current_price=round(current_price, 4),
        total_cost=round(total_cost, 2),
        break_even_unit=break_even_unit,
        rows=rows,
    )