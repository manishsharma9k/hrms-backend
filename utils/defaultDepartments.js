const defaultDepartments = [
    { name: 'Engineering', description: 'Software development and product engineering' },
    { name: 'Human Resources', description: 'Recruitment, employee relations, and HR operations' },
    { name: 'Finance', description: 'Payroll, accounts, and financial planning' },
    { name: 'Marketing', description: 'Brand, campaigns, and digital marketing' },
    { name: 'Sales', description: 'Client acquisition and revenue growth' },
    { name: 'Operations', description: 'Daily business operations and process management' },
    { name: 'IT Support', description: 'Internal systems, hardware, and technical support' }
];

const ensureDefaultDepartments = async (Department) => {
    const count = await Department.countDocuments();
    if (count === 0) {
        await Department.insertMany(defaultDepartments, { ordered: false });
    }
};

module.exports = { ensureDefaultDepartments };
