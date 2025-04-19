import { useMemo } from 'react';

type Activity = {
  id: string;
  cost: number;
  [key: string]: any;
};

type Day = {
  date: string;
  activities: Activity[];
};

type Budget = {
  accommodation?: number;
  food?: number;
  activities?: number;
  transport?: number;
  total?: number;
};

type ItineraryWithBudget = {
  days: Day[];
  budget?: Budget;
};

/**
 * Custom hook that normalizes budget data and calculates totals if missing
 * It ensures the budget object has all required properties even if they're missing
 * from the API response or stored data.
 */
export function useBudgetCalculator(itinerary: ItineraryWithBudget | null) {
  return useMemo(() => {
    if (!itinerary) {
      return {
        accommodation: 0,
        food: 0,
        activities: 0,
        transport: 0,
        total: 0,
      };
    }

    // Get budget from itinerary or create empty object
    const budget = itinerary.budget || {};
    
    // Initialize with defaults
    const normalizedBudget = {
      accommodation: budget.accommodation || 0,
      food: budget.food || 0,
      transport: budget.transport || 0,
      activities: 0, // Will calculate from activities if not provided
      total: 0, // Will be calculated
    };
    
    // Calculate activities cost from actual activities or use provided value
    if (budget.activities !== undefined) {
      normalizedBudget.activities = budget.activities;
    } else {
      // Sum up all activity costs
      let totalActivitiesCost = 0;
      for (const day of itinerary.days || []) {
        if (day.activities && Array.isArray(day.activities)) {
          for (const activity of day.activities) {
            if (activity && typeof activity.cost === 'number') {
              totalActivitiesCost += activity.cost;
            } else if (activity && activity.cost) {
              // Try to convert to number if it's not already
              const cost = parseFloat(String(activity.cost));
              if (!isNaN(cost)) {
                totalActivitiesCost += cost;
              }
            }
          }
        }
      }
      normalizedBudget.activities = totalActivitiesCost;
    }
    
    // Calculate total
    normalizedBudget.total = 
      normalizedBudget.accommodation + 
      normalizedBudget.food + 
      normalizedBudget.activities + 
      normalizedBudget.transport;
    
    // If budget.total is provided and is different from calculated total,
    // log a warning but use the calculated value for consistency
    if (budget.total !== undefined && budget.total !== normalizedBudget.total) {
      console.warn('Provided budget total does not match calculated total. Using calculated total for consistency.');
    }
    
    return normalizedBudget;
  }, [itinerary]);
}

export default useBudgetCalculator; 