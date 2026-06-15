const mongoose = require('mongoose');
const Department = require('../models/departmentModel');

const isValidObjectId = (value) => {
  if (!value) return false;
  try {
    const id = typeof value === 'string' ? value.trim() : value;
    return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
  } catch (err) {
    return false;
  }
};

const resolveDepartmentId = async (department) => {
  if (!department) return null;
  const normalized = typeof department === 'string' ? department.trim() : String(department).trim();
  if (!normalized) return null;

  if (isValidObjectId(normalized)) {
    return normalized;
  }

  const found = await Department.findOne({ name: { $regex: new RegExp(`^${normalized}$`, 'i') } });
  if (found) return found._id;

  const newDept = await Department.create({ name: normalized });
  return newDept._id;
};

module.exports = resolveDepartmentId;
