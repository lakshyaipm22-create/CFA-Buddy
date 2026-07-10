export interface FormulaEntry {
  id: string;
  name: string;
  subject: string;
  reading: string;
  formula: string; // text/math notation
  variables: string;
  example: string;
}

export const formulaSeed: FormulaEntry[] = [
  // ══════ Quantitative Methods ══════
  { id: 'f-tvm-fv', name: 'Future Value (Single Sum)', subject: 'Quantitative Methods', reading: 'Time Value of Money', formula: 'FV = PV × (1 + r)^n', variables: 'PV = Present Value, r = interest rate per period, n = number of periods', example: 'FV = $1,000 × (1.08)^5 = $1,469.33' },
  { id: 'f-tvm-pv', name: 'Present Value (Single Sum)', subject: 'Quantitative Methods', reading: 'Time Value of Money', formula: 'PV = FV / (1 + r)^n', variables: 'FV = Future Value, r = discount rate, n = periods', example: 'PV = $1,469.33 / (1.08)^5 = $1,000' },
  { id: 'f-tvm-annuity', name: 'PV of Ordinary Annuity', subject: 'Quantitative Methods', reading: 'Time Value of Money', formula: 'PV = PMT × [(1 - (1+r)^(-n)) / r]', variables: 'PMT = periodic payment, r = rate, n = periods', example: 'PV = $100 × [(1-(1.05)^(-10))/0.05] = $772.17' },
  { id: 'f-stat-mean', name: 'Arithmetic Mean', subject: 'Quantitative Methods', reading: 'Statistical Measures', formula: 'x̄ = Σxi / n', variables: 'xi = each observation, n = number of observations', example: '(10+12+14)/3 = 12' },
  { id: 'f-stat-std', name: 'Standard Deviation', subject: 'Quantitative Methods', reading: 'Statistical Measures', formula: 'σ = √[Σ(xi - x̄)² / (n-1)]', variables: 'xi = observation, x̄ = mean, n = sample size', example: 'For returns 8%, 12%, 10%: σ = 2%' },
  { id: 'f-stat-cv', name: 'Coefficient of Variation', subject: 'Quantitative Methods', reading: 'Statistical Measures', formula: 'CV = σ / x̄', variables: 'σ = standard deviation, x̄ = mean', example: 'CV = 5% / 12% = 0.417' },

  // ══════ Economics ══════
  { id: 'f-econ-gdp', name: 'GDP (Expenditure)', subject: 'Economics', reading: 'Aggregate Output', formula: 'GDP = C + I + G + (X - M)', variables: 'C=consumption, I=investment, G=government, X=exports, M=imports', example: 'GDP = 70+15+20+(5-10) = 100' },
  { id: 'f-econ-fisher', name: 'Fisher Effect', subject: 'Economics', reading: 'Monetary Policy', formula: 'Nominal Rate ≈ Real Rate + Expected Inflation', variables: 'Exact: (1+nom) = (1+real)(1+inf)', example: 'Nominal ≈ 3% + 2% = 5%' },
  { id: 'f-econ-elasticity', name: 'Price Elasticity of Demand', subject: 'Economics', reading: 'Demand and Supply', formula: 'Ed = %ΔQd / %ΔP', variables: 'Qd = quantity demanded, P = price', example: 'Ed = -20%/10% = -2.0 (elastic)' },

  // ══════ Financial Statement Analysis ══════
  { id: 'f-fsa-current', name: 'Current Ratio', subject: 'Financial Statement Analysis', reading: 'Financial Analysis Techniques', formula: 'Current Ratio = Current Assets / Current Liabilities', variables: 'Higher = more liquid', example: '$500K / $250K = 2.0' },
  { id: 'f-fsa-roe', name: 'Return on Equity (DuPont)', subject: 'Financial Statement Analysis', reading: 'Financial Analysis Techniques', formula: 'ROE = Net Margin × Asset Turnover × Equity Multiplier', variables: 'NI/Sales × Sales/Assets × Assets/Equity', example: '5% × 1.5 × 2.0 = 15%' },
  { id: 'f-fsa-debt-equity', name: 'Debt-to-Equity Ratio', subject: 'Financial Statement Analysis', reading: 'Financial Analysis Techniques', formula: 'D/E = Total Debt / Total Equity', variables: 'Higher = more leveraged', example: '$400M / $600M = 0.67' },

  // ══════ Corporate Issuers ══════
  { id: 'f-ci-wacc', name: 'WACC', subject: 'Corporate Issuers', reading: 'Cost of Capital', formula: 'WACC = (E/V)×re + (D/V)×rd×(1-t)', variables: 'E=equity, D=debt, V=E+D, re=cost equity, rd=cost debt, t=tax rate', example: '(0.6×12%) + (0.4×6%×0.7) = 8.88%' },
  { id: 'f-ci-npv', name: 'Net Present Value', subject: 'Corporate Issuers', reading: 'Capital Budgeting', formula: 'NPV = Σ[CFt / (1+r)^t] - Initial Investment', variables: 'CFt = cash flow at time t, r = discount rate', example: 'NPV = -1000 + 400/1.1 + 500/1.21 + 600/1.331 = $227' },
  { id: 'f-ci-dol', name: 'Degree of Operating Leverage', subject: 'Corporate Issuers', reading: 'Measures of Leverage', formula: 'DOL = %Δ Operating Income / %Δ Sales', variables: 'Also: DOL = (Sales - Variable Costs) / Operating Income', example: 'DOL = 20% / 10% = 2.0' },

  // ══════ Equity Investments ══════
  { id: 'f-eq-ddm', name: 'Gordon Growth Model (DDM)', subject: 'Equity Investments', reading: 'Equity Valuation', formula: 'V₀ = D₁ / (r - g)', variables: 'D₁ = next dividend, r = required return, g = constant growth rate', example: 'V₀ = $2 / (0.10 - 0.04) = $33.33' },
  { id: 'f-eq-pe', name: 'Price-to-Earnings Ratio', subject: 'Equity Investments', reading: 'Equity Valuation', formula: 'P/E = Market Price per Share / EPS', variables: 'Leading P/E uses expected EPS; trailing uses last 12 months', example: 'P/E = $50 / $3.33 = 15x' },
  { id: 'f-eq-capm', name: 'CAPM', subject: 'Equity Investments', reading: 'Portfolio Risk and Return', formula: 'E(R) = Rf + β × (E(Rm) - Rf)', variables: 'Rf = risk-free, β = beta, E(Rm) = market return', example: 'E(R) = 3% + 1.2 × 7% = 11.4%' },

  // ══════ Fixed Income ══════
  { id: 'f-fi-bond', name: 'Bond Price', subject: 'Fixed Income', reading: 'Bond Valuation', formula: 'P = Σ[C/(1+r)^t] + FV/(1+r)^n', variables: 'C = coupon, r = YTM, FV = face value, n = periods', example: '5% coupon, 3yr, YTM=6%: P = $97.33' },
  { id: 'f-fi-duration', name: 'Modified Duration', subject: 'Fixed Income', reading: 'Fixed-Income Risk', formula: 'ModDur = MacDur / (1 + YTM/k)', variables: 'MacDur = Macaulay duration, YTM = yield, k = periods/year', example: 'ModDur = 7.2 / 1.05 = 6.86' },
  { id: 'f-fi-price-change', name: 'Duration Price Change', subject: 'Fixed Income', reading: 'Fixed-Income Risk', formula: 'ΔP/P ≈ -ModDur × Δy + ½ × Convexity × (Δy)²', variables: 'Δy = yield change in decimal', example: 'ΔP ≈ -6.86×0.01 + 0.5×50×0.0001 = -6.61%' },

  // ══════ Derivatives ══════
  { id: 'f-deriv-pcp', name: 'Put-Call Parity', subject: 'Derivatives', reading: 'Derivative Pricing', formula: 'C + PV(X) = P + S', variables: 'C = call premium, PV(X) = PV of strike, P = put premium, S = stock price', example: '$5 + $47.62 = P + $50 → P = $2.62' },
  { id: 'f-deriv-forward', name: 'Forward Price (No Income)', subject: 'Derivatives', reading: 'Derivative Pricing', formula: 'F₀ = S₀ × (1 + r)^T', variables: 'S₀ = spot price, r = risk-free rate, T = time in years', example: 'F = $100 × 1.05^0.5 = $102.47' },

  // ══════ Alternative Investments ══════
  { id: 'f-ai-sharpe', name: 'Sharpe Ratio', subject: 'Alternative Investments', reading: 'Performance Evaluation', formula: 'Sharpe = (Rp - Rf) / σp', variables: 'Rp = portfolio return, Rf = risk-free rate, σp = portfolio std dev', example: 'Sharpe = (12% - 3%) / 15% = 0.60' },
  { id: 'f-ai-nav', name: 'REIT NAV', subject: 'Alternative Investments', reading: 'Real Estate', formula: 'NAV = Market Value of Assets - Liabilities', variables: 'Per share: NAV/shares outstanding', example: 'NAV = $500M - $200M = $300M → $30/share' },

  // ══════ Portfolio Management ══════
  { id: 'f-pm-port-var', name: 'Two-Asset Portfolio Variance', subject: 'Portfolio Management', reading: 'Portfolio Risk', formula: 'σ²p = w₁²σ₁² + w₂²σ₂² + 2w₁w₂σ₁σ₂ρ₁₂', variables: 'w = weight, σ = std dev, ρ = correlation', example: '(0.6²×0.04)+(0.4²×0.09)+(2×0.6×0.4×0.2×0.3×0.5)' },
  { id: 'f-pm-cal', name: 'Capital Allocation Line', subject: 'Portfolio Management', reading: 'Portfolio Risk', formula: 'E(Rc) = Rf + [(E(Rp) - Rf) / σp] × σc', variables: 'Slope = Sharpe ratio of risky portfolio', example: 'E(Rc) = 3% + 0.6 × 10% = 9%' },

  // ══════ Ethics ══════
  { id: 'f-ethics-gips', name: 'GIPS Composite Return', subject: 'Ethical and Professional Standards', reading: 'GIPS', formula: 'Composite Return = Σ(wi × Ri)', variables: 'wi = beginning-period weight of portfolio i, Ri = return of portfolio i', example: 'Return = 0.4×12% + 0.6×8% = 9.6%' },
  { id: 'f-ethics-twrr', name: 'Time-Weighted Return', subject: 'Ethical and Professional Standards', reading: 'GIPS', formula: 'TWRR = [(1+R₁)(1+R₂)...(1+Rn)]^(1/n) - 1', variables: 'Ri = return for sub-period i, n = number of years', example: 'TWRR = [(1.10)(0.95)(1.15)]^(1/3) - 1 = 6.2%' },
];
