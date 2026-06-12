const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/userModel');
const Department = require('./models/departmentModel');
const Holiday = require('./models/holidayModel');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const importData = async () => {
    try {
        await User.deleteMany();
        await Department.deleteMany();
        await Holiday.deleteMany();

        const dept1 = await Department.create({ name: 'Engineering', description: 'Software Development Team' });
        const dept2 = await Department.create({ name: 'HR', description: 'Human Resources' });
        const dept3 = await Department.create({ name: 'Finance', description: 'Finance & Accounts' });
        const dept4 = await Department.create({ name: 'Marketing', description: 'Marketing & Sales' });
        const dept5 = await Department.create({ name: 'Operations', description: 'Operations & Logistics' });
        const dept6 = await Department.create({ name: 'Design', description: 'UI/UX & Graphic Design' });
        const dept7 = await Department.create({ name: 'Sales', description: 'Sales & Business Development' });
        const dept8 = await Department.create({ name: 'Support', description: 'Customer Support' });

        await User.create([
            {
                name: 'Admin User',
                email: 'admin@company.com',
                password: 'admin123',
                role: 'admin',
                department: dept2._id,
                salary: 100000
            },
            {
                name: 'Employee One',
                email: 'emp@company.com',
                password: 'emp123',
                role: 'employee',
                department: dept1._id,
                salary: 60000
            }
        ]);

        const year = new Date().getFullYear();
        await Holiday.create([
            { name: 'New Year', date: new Date(`${year}-01-01`), type: 'National', description: 'New Year Day' },
            { name: 'Republic Day', date: new Date(`${year}-01-26`), type: 'National', description: 'Republic Day of India' },
            { name: 'Holi', date: new Date(`${year}-03-14`), type: 'National', description: 'Festival of Colors' },
            { name: 'Good Friday', date: new Date(`${year}-04-18`), type: 'National', description: 'Good Friday' },
            { name: 'Independence Day', date: new Date(`${year}-08-15`), type: 'National', description: 'Independence Day of India' },
            { name: 'Gandhi Jayanti', date: new Date(`${year}-10-02`), type: 'National', description: 'Gandhi Jayanti' },
            { name: 'Dussehra', date: new Date(`${year}-10-02`), type: 'National', description: 'Dussehra' },
            { name: 'Diwali', date: new Date(`${year}-10-20`), type: 'National', description: 'Festival of Lights' },
            { name: 'Christmas', date: new Date(`${year}-12-25`), type: 'National', description: 'Christmas Day' },
            { name: 'Company Foundation Day', date: new Date(`${year}-07-01`), type: 'Company', description: 'Company Anniversary' },
        ]);

        console.log('Data Imported!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

importData();
