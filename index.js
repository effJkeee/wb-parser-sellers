import mongoose from "mongoose";
import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";
import { SellerWb } from "./models/sellerwb.js";
import { Error } from "./models/error.js";

mongoose
   .connect(`mongodb://localhost:27017/wbsellers`)
   .then((res) => console.log("DB connected..."))
   .catch((err) => console.error("Connected DB ERROR!"));

// Настройки скрипта
const deleteOldData = false; // Удалить всю коллекцию перед парсингом
const startFrom = 1; // с какого id стартуем
const endTo = 1000; // до какого id парсим
const isConnectProxy = false; // Включить прокси: true
const indexProxy = 0; // выбираем какой прокси адрес подключить

// список прокси
const proxy = [
   "login:password@109.248.204.78:5500",
   "login:password@46.8.223.195:5500",
   "login:password@188.130.129.232:5500",
   "login:password@46.8.212.193:5500",
   "login:password@188.130.218.72:5500",
   "login:password@188.130.219.32:5500",
   "login:password@95.182.126.197:5500",
   "login:password@45.81.136.205:5500",
   "login:password@45.84.176.11:5500",
   "login:password@46.8.17.180:5500",
];

function time() {
   return `[${new Date().getHours().toString().padStart(2, 0)}:${new Date()
      .getMinutes()
      .toString()
      .padStart(2, 0)}:${new Date().getSeconds().toString().padStart(2, 0)}]`;
}

function delay(ms) {
   return new Promise((resolve, reject) => {
      setTimeout(resolve, ms);
   });
}

const options = {
   headers: {
      "Content-Type": "application/json",
      "User-Agent":
         "Mozilla/5.0 (compatible; Mpstats SerpBot/1.0; +https://mpstats.io/bots)",
   },
};
if (isConnectProxy)
   options.agent = new HttpsProxyAgent(`http://${proxy[indexProxy]}`);

// Запуск скрипта
let recordData = 0;
let notRecordData = 0;
let isActiveId = 0;
let errorId = [];
if (deleteOldData) await SellerWb.deleteMany();

for (let i = startFrom; i <= endTo; i++) {
   try {
      isActiveId = i;
      // запрос к вб
      const response = await fetch(
         `https://www.wildberries.ru/webapi/seller/data/short/${i}`,
         options
      );
      const result = await response.json();

      // await delay(200);

      // если продавца нет, пропускает итерацию цикла
      if (result.isUnknown) {
         notRecordData++;
         console.log(time(), `id: ${result?.id} не существует!`);
         continue;
      }
      // если выдаёт статус не 200, останавливаем скрипт
      if (response.status !== 200) {
         console.error("Статус ответа: ", response.status);
         console.error("Ответ: ", result);
         console.log(
            `из ${
               i - startFrom
            } проверок записано: ${recordData} селлеров, и ${notRecordData} фейковых. C ошибками: ${
               errorId.length
            }`
         );
         console.log(errorId);
         break;
      }

      // Подготовка схемы к записи в БД
      const data = new SellerWb({
         id: result?.id,
         name: result?.name?.replace(/"/g, "")?.replace(/'/g, ""),
         fineName: result?.fineName?.replace(/"/g, "")?.replace(/'/g, ""),
         ogrnip: result?.ogrnip,
         trademark: result?.trademark?.replace(/"/g, "")?.replace(/'/g, ""),
      });

      // запись в БД
      await data.save();

      recordData++;
      console.log(time(), `Добавлен id: ${result?.id}`);
   } catch (err) {
      console.error(err.message);
      const error = new Error({
         id: isActiveId,
         potok: indexProxy,
      });
      await error.save();
      errorId.push(isActiveId);
   }
}

// Обработка ошибок
let errorRecordData = 0;
let errorNotRecordData = 0;
const errorsData = await Error.find({ potok: indexProxy });

for (let i = 0; i < errorsData.length; i++) {
   try {
      isActiveId = i;
      // запрос к вб
      const response = await fetch(
         `https://www.wildberries.ru/webapi/seller/data/short/${errorsData[i].id}`,
         options
      );
      const result = await response.json();

      await delay(200);

      // если продавца нет, пропускает итерацию цикла
      if (result.isUnknown) {
         errorNotRecordData++;
         notRecordData++;
         await Error.findByIdAndDelete({ _id: errorsData[i]._id });
         console.log(time(), `id: ${result?.id} не существует! [ПОСЛЕ ОШИБКИ]`);
         continue;
      }
      // если выдаёт статус не 200, останавливаем скрипт
      if (response.status !== 200) {
         console.error("Статус ответа: ", response.status);
         console.error("Ответ: ", result);
         console.log(
            `из ${
               i - startFrom
            } проверок записано: ${recordData} селлеров, и ${notRecordData} фейковых. C ошибками: ${
               errorId.length
            }`
         );
         console.log(errorId);
         break;
      }

      // Подготовка схемы к записи в БД
      const data = new SellerWb({
         id: result?.id,
         name: result?.name?.replace(/"/g, "")?.replace(/'/g, ""),
         fineName: result?.fineName?.replace(/"/g, "")?.replace(/'/g, ""),
         ogrnip: result?.ogrnip,
         trademark: result?.trademark?.replace(/"/g, "")?.replace(/'/g, ""),
      });

      // запись в БД
      await data.save();

      // удаляем из Error БД
      await Error.findByIdAndDelete({ _id: errorsData[i]._id });

      recordData++;
      errorRecordData++;
      console.log(time(), `Добавлен id [ПОСЛЕ ОШИБКИ]: ${result?.id}`);
   } catch (err) {
      console.error(err.message);
   }
}

console.log(
   "ГОТОВО!",
   `из ${
      endTo - startFrom
   } проверок записано: ${recordData} селлеров, и ${notRecordData} фейковых. С ошибками: ${
      errorId.length
   }, после обработки ошибок ещё добавлено ${errorRecordData} / ${errorNotRecordData} селлера из ${
      errorsData.length
   }`
);
console.log(errorId);
