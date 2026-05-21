function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeRate(value) {
  const num = toNumber(value, 0);
  if (num <= 0) return 0;
  return num > 1 ? num / 100 : num;
}

function roundMoney(value) {
  return Math.round(toNumber(value, 0) * 100) / 100;
}

function calculateShareSnapshot(input) {
  const orderAmount = roundMoney(input.orderAmount);
  const technicianRate = normalizeRate(input.technicianRate);
  const propertyRate = normalizeRate(input.propertyRate);
  const buildingManagerRate = normalizeRate(input.buildingManagerRate);
  const materialCost = roundMoney(input.materialCost);
  const receivedAmount = roundMoney(input.receivedAmount);
  const shareBaseAmount = roundMoney(Math.max(orderAmount - materialCost, 0));

  const technicianAmount = roundMoney(shareBaseAmount * technicianRate);
  const propertyAmount = roundMoney(shareBaseAmount * propertyRate);
  const buildingManagerAmount = roundMoney(shareBaseAmount * buildingManagerRate);
  const companyAmount = roundMoney(
    shareBaseAmount - technicianAmount - propertyAmount - buildingManagerAmount
  );

  return {
    orderAmount,
    shareBaseAmount,
    technicianRate,
    technicianAmount,
    propertyRate,
    propertyAmount,
    buildingManagerRate,
    buildingManagerAmount,
    materialCost,
    companyAmount,
    receivedAmount,
    collectionDifference: roundMoney(orderAmount - receivedAmount)
  };
}

module.exports = {
  toNumber,
  normalizeRate,
  roundMoney,
  calculateShareSnapshot
};
