const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const csv = require('csv-parser');
const { Readable } = require('stream');

const getTowns = async (req, res) => {
	try {
		const towns = await prisma.towns.findMany({
			include: {
				department: true,
			},
			orderBy: {
				department: {
					name: 'asc',
				},
			},
		});

		if (towns.length === 0) {
			return res.status(404).json({ message: 'No towns found' });
		}

		return res.status(200).json(towns);
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: 'Error fetching towns' });
	}
};

const uploadFromBatch = async (req, res) => {
	const { file } = req;

	if (!file) {
		return res.status(400).json({ message: 'No file uploaded' });
	}

	const { mimetype } = file;
	if (mimetype !== 'text/csv') {
		return res.status(400).json({ message: 'Invalid file type' });
	}

	let towns = [];
	try {
		towns = await getTownsFromCsv(file);
	} catch (error) {
		return res.status(500).json({ message: 'Error processing file' });
	}

	if (towns.length === 0) {
		return res.status(400).json({ message: 'No towns found in file' });
	}

	const departmentsSaveErrors = [];
	const uniqueDepartmentsMap = new Map();
	towns.forEach((town) => {
		if (!uniqueDepartmentsMap.has(town.COD_DEPARTAMENTO)) {
			uniqueDepartmentsMap.set(town.COD_DEPARTAMENTO, town.DEPARTAMENTO);
		}
	});

	const uniqueDepartments = Array.from(uniqueDepartmentsMap, ([id, name]) => ({
		id,
		name,
	}));

	const departmentsToCreate = [];
	try {
		const nonCreatedDepartments = await getNonCreatedDepartments(
			uniqueDepartments,
			departmentsSaveErrors
		);

		departmentsToCreate.push(...nonCreatedDepartments);
	} catch (error) {
		console.log(error);
	}

	let createdDepartmentsCount = 0;
	try {
		if (departmentsToCreate.length > 0) {
			const createdDepartments = await prisma.departments.createMany({
				data: departmentsToCreate,
			});

			createdDepartmentsCount = createdDepartments.count;
		}
	} catch (error) {
		console.log(error);
	}

	const townsSaveErrors = [];
	const uniqueTownsMap = new Map();
	towns.forEach((town) => {
		if (!uniqueTownsMap.has(town.COD_MUNICIPIO)) {
			uniqueTownsMap.set(town.COD_MUNICIPIO, {
				name: town.MUNICIPIO,
				department_id: town.COD_DEPARTAMENTO,
			});
		}
	});

	const uniqueTowns = Array.from(uniqueTownsMap, ([id, townData]) => ({
		id,
		name: townData.name,
		department_id: townData.department_id,
	}));

	const townsToCreate = [];
	try {
		const nonCreatedTowns = await getNonCreatedTowns(
			uniqueTowns,
			townsSaveErrors
		);

		townsToCreate.push(...nonCreatedTowns);
	} catch (error) {
		console.log(error);
	}

	let createdTownsCount = 0;
	try {
		if (townsToCreate.length > 0) {
			const createdTowns = await prisma.towns.createMany({
				data: townsToCreate,
			});

			createdTownsCount = createdTowns.count;
		}
	} catch (error) {
		console.log(error);
	}

	return res.status(200).json({
		message: 'batch uploaded successfully',
		createdDepartmentsCount,
		createdTownsCount,
		departmentsSaveErrors,
		townsSaveErrors,
	});
};

const getTownsFromCsv = (file) => {
	const results = [];

	return new Promise((resolve, reject) => {
		Readable.from(file.buffer)
			.pipe(csv())
			.on('data', (data) => results.push(data))
			.on('end', () => {
				resolve(results);
			})
			.on('error', (error) => {
				reject(error);
			});
	});
};

const getNonCreatedDepartments = async (
	departmentsToCreate,
	departmentsSaveErrors
) => {
	const createdDepartments = await prisma.departments.findMany();
	const nonCreatedDepartments = [];

	departmentsToCreate.forEach((department) => {
		const foundDepartment = createdDepartments.find(
			(dep) => dep.id === department.id
		);

		if (foundDepartment) {
			return departmentsSaveErrors.push({
				department: department.name,
				error: 'Department exists in database',
			});
		}

		nonCreatedDepartments.push(department);
	});

	return [...nonCreatedDepartments];
};

const getNonCreatedTowns = async (townsToCreate, townsSaveErrors) => {
	const createdTowns = await prisma.towns.findMany();
	const nonCreatedTowns = [];

	townsToCreate.forEach((town) => {
		const foundTown = createdTowns.find((twn) => twn.id === town.id);

		if (foundTown) {
			return townsSaveErrors.push({
				town: town.name,
				error: 'Town exists in database',
			});
		}

		nonCreatedTowns.push(town);
	});

	return nonCreatedTowns;
};

module.exports = {
	uploadFromBatch,
	getTowns,
};
