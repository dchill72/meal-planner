print('Started Adding the Users.');
db = db.getSiblingDB('mealplanner');
db.createUser({
  user: process.env.MONGO_SERVICE_USER,
  pwd: process.env.MONGO_SERVICE_PASSWORD,
  roles: [{ role: 'readWrite', db: 'mealplanner' }],
});
print('End Adding the User Roles.');
