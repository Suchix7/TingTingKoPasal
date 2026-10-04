import Sale from "../models/Sale.js";

const DEFAULT_WEIGHTS = [0.2, 0.3, 0.5];

function parseWeights(weightsQuery) {
  if (!weightsQuery) return DEFAULT_WEIGHTS;

  return weightsQuery
    .split(",")
    .map((weight) => Number(weight.trim()))
    .filter((weight) => !Number.isNaN(weight));
}

function validateWeights(weights) {
  if (!Array.isArray(weights) || weights.length === 0) {
    return { valid: false, message: "Weights must be a valid list of numbers." };
  }

  if (weights.some((weight) => weight <= 0)) {
    return { valid: false, message: "Each weight must be greater than 0." };
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(totalWeight - 1) > 0.001) {
    return { valid: false, message: "Total weights must be equal to 1. Example: 0.2,0.3,0.5" };
  }

  return { valid: true };
}

function calculateWeightedMovingAverage(previousPeriods, weights) {
  let forecast = 0;
  for (let i = 0; i < weights.length; i++) {
    forecast += previousPeriods[i].actual_sales * weights[i];
  }
  return Number(forecast.toFixed(2));
}

function calculateAccuracyMetrics(forecastData) {
  const validRows = forecastData.filter(
    (row) => row.forecast_sales !== null && row.actual_sales !== null && row.actual_sales > 0,
  );

  if (validRows.length === 0) {
    return { mae: null, mape: null, accuracy_percentage: null };
  }

  const totalAbsoluteError = validRows.reduce((sum, row) => sum + row.absolute_error, 0);
  const totalPercentageError = validRows.reduce((sum, row) => sum + row.percentage_error, 0);

  const mae = totalAbsoluteError / validRows.length;
  const mape = totalPercentageError / validRows.length;
  const accuracyPercentage = Math.max(0, 100 - mape);

  return {
    mae: Number(mae.toFixed(2)),
    mape: Number(mape.toFixed(2)),
    accuracy_percentage: Number(accuracyPercentage.toFixed(2)),
  };
}

async function fetchPeriodSeries(periodType, startDate, endDate) {
  const match = { paymentStatus: { $nin: ["Cancelled", "Refunded"] } };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) {
      const end = new Date(`${endDate}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      match.createdAt.$lt = end;
    }
  }

  if (periodType === "weekly") {
    const rows = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: { year: { $isoWeekYear: "$createdAt" }, week: { $isoWeek: "$createdAt" } },
          actual_sales: { $sum: "$grandTotal" },
          total_orders: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
    ]);

    return rows.map((r) => ({
      period: `${r._id.year}-W${String(r._id.week).padStart(2, "0")}`,
      actual_sales: Number((r.actual_sales || 0).toFixed(2)),
      total_orders: r.total_orders,
    }));
  }

  const format = periodType === "monthly" ? "%Y-%m" : "%Y-%m-%d";

  const rows = await Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format, date: "$createdAt" } },
        actual_sales: { $sum: "$grandTotal" },
        total_orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return rows.map((r) => ({
    period: r._id,
    actual_sales: Number((r.actual_sales || 0).toFixed(2)),
    total_orders: r.total_orders,
  }));
}

export const getSalesForecast = async (req, res) => {
  try {
    const { periodType = "daily", startDate, endDate, weights: weightsQuery } = req.query;

    const allowedPeriods = ["daily", "weekly", "monthly"];
    if (!allowedPeriods.includes(periodType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid periodType. Use daily, weekly, or monthly.",
      });
    }

    const weights = parseWeights(weightsQuery);
    const weightValidation = validateWeights(weights);

    if (!weightValidation.valid) {
      return res.status(400).json({ success: false, message: weightValidation.message });
    }

    const windowSize = weights.length;

    const salesRows = await fetchPeriodSeries(periodType, startDate, endDate);

    if (salesRows.length === 0) {
      return res.json({
        success: true,
        message: "No sales data found for forecasting.",
        algorithm: "Weighted Moving Average",
        period_type: periodType,
        window_size: windowSize,
        weights,
        total_periods: 0,
        data: [],
        next_forecast: null,
        metrics: { mae: null, mape: null, accuracy_percentage: null },
      });
    }

    const forecastData = salesRows.map((row, index) => {
      const actualSales = Number(row.actual_sales || 0);

      if (index < windowSize) {
        return {
          period: row.period,
          actual_sales: actualSales,
          forecast_sales: null,
          forecast_error: null,
          absolute_error: null,
          percentage_error: null,
          total_orders: row.total_orders,
          used_periods: [],
        };
      }

      const previousPeriods = salesRows.slice(index - windowSize, index);
      const forecastSales = calculateWeightedMovingAverage(previousPeriods, weights);
      const forecastError = Number((actualSales - forecastSales).toFixed(2));
      const absoluteError = Number(Math.abs(forecastError).toFixed(2));
      const percentageError =
        actualSales > 0 ? Number(((absoluteError / actualSales) * 100).toFixed(2)) : null;

      return {
        period: row.period,
        actual_sales: actualSales,
        forecast_sales: forecastSales,
        forecast_error: forecastError,
        absolute_error: absoluteError,
        percentage_error: percentageError,
        total_orders: row.total_orders,
        used_periods: previousPeriods.map((periodRow, previousIndex) => ({
          period: periodRow.period,
          actual_sales: Number(periodRow.actual_sales || 0),
          weight: weights[previousIndex],
        })),
      };
    });

    let nextForecast = null;
    let nextForecastUsedPeriods = [];

    if (salesRows.length >= windowSize) {
      const latestPeriods = salesRows.slice(salesRows.length - windowSize);
      nextForecast = calculateWeightedMovingAverage(latestPeriods, weights);
      nextForecastUsedPeriods = latestPeriods.map((periodRow, index) => ({
        period: periodRow.period,
        actual_sales: Number(periodRow.actual_sales || 0),
        weight: weights[index],
      }));
    }

    const metrics = calculateAccuracyMetrics(forecastData);

    const latestActualSales =
      salesRows.length > 0 ? Number(salesRows[salesRows.length - 1].actual_sales || 0) : null;

    const forecastDirection =
      nextForecast !== null && latestActualSales !== null
        ? nextForecast > latestActualSales
          ? "increase"
          : nextForecast < latestActualSales
            ? "decrease"
            : "stable"
        : null;

    const summary = {
      latest_period: salesRows[salesRows.length - 1]?.period || null,
      latest_actual_sales: latestActualSales,
      next_forecast: nextForecast,
      forecast_direction: forecastDirection,
      total_sales_periods: salesRows.length,
      periods_used_for_forecast: windowSize,
      enough_data_for_forecast: salesRows.length >= windowSize,
    };

    return res.json({
      success: true,
      algorithm: "Weighted Moving Average",
      period_type: periodType,
      window_size: windowSize,
      weights,
      total_periods: salesRows.length,
      summary,
      metrics,
      next_forecast: { forecast_sales: nextForecast, used_periods: nextForecastUsedPeriods },
      data: forecastData,
    });
  } catch (error) {
    console.log("Error while generating sales forecast:", error);

    return res.status(500).json({
      success: false,
      message: "Error while generating sales forecast.",
      error: error.message,
    });
  }
};
