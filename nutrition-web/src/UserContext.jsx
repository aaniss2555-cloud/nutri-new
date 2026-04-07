import React, { createContext, useState } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([
    {
      name: "Ahmed",
      plan: "Weight Loss Plan",
      weeklyCalories: [2100, 1800, 2000], // past days only
      meals: [],
      profile: { age: 25, weight: 70, allergies: "None", avoid: "Fried foods" },
    },
    {
      name: "Lina",
      plan: "Muscle Gain Plan",
      weeklyCalories: [2500, 2600, 2400],
      meals: [],
      profile: {
        age: 28,
        weight: 60,
        allergies: "Peanuts",
        avoid: "Sugary drinks",
      },
    },
  ]);

  const assignPlan = (userName, planName) => {
    setUsers((prev) =>
      prev.map((u) => (u.name === userName ? { ...u, plan: planName } : u)),
    );
  };

  const removeUser = (userName) => {
    setUsers((prev) => prev.filter((u) => u.name !== userName));
  };

  const addMeal = (userName, meal) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.name === userName ? { ...u, meals: [...u.meals, meal] } : u,
      ),
    );
  };

  const updateProfile = (userName, profile) => {
    setUsers((prev) =>
      prev.map((u) => (u.name === userName ? { ...u, profile } : u)),
    );
  };

  return (
    <UserContext.Provider
      value={{ users, assignPlan, removeUser, addMeal, updateProfile }}
    >
      {children}
    </UserContext.Provider>
  );
};
