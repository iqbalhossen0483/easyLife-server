const express = require("express");
const {
  addExpenseType,
  getexpenseTypes,
  deleteexpenseType,
  editexpenseType,
  addExpenseReport,
  getExpenseReports,
  achieveExpense,
  declineExpense,
} = require("../controllers/expense");

const expenseRouter = express.Router();

expenseRouter.post("/", addExpenseReport);
expenseRouter.get("/", getExpenseReports);
expenseRouter.post("/achieve", achieveExpense);
expenseRouter.post("/type", addExpenseType);
expenseRouter.put("/type", editexpenseType);
expenseRouter.delete("/type", deleteexpenseType);
expenseRouter.get("/type", getexpenseTypes);
expenseRouter.delete("/", declineExpense);

module.exports = expenseRouter;
