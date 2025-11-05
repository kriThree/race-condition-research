db = db.getSiblingDB('racedb');

// Создаем коллекцию и индексы
db.createCollection('counters');
db.counters.createIndex({ version: 1 });
db.counters.createIndex({ _id: 1, version: 1 });

// Вставляем начальные данные
db.counters.insertMany([
    {
        _id: ObjectId("690a983797044ff4ddd56cbd"),
        name: 'test-unsafe',
        value: 0,
        version: 0,
        updatedAt: new Date()
    },
]);