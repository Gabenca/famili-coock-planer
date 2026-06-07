# Кухня для двоих

MVP Telegram Mini App для пар: сохранять рецепты, планировать готовку на неделю и вести общий список покупок.

## Стек

- Next.js App Router, React, TypeScript, Tailwind CSS
- Prisma и схема PostgreSQL
- Проверка Telegram Mini App `initData`
- Vitest и Testing Library

## Локальный запуск

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run dev
```

По умолчанию приложение открывается на `http://localhost:3000`. Для production-запуска в Telegram переменная `NEXT_PUBLIC_APP_URL` должна указывать на HTTPS URL, настроенный в BotFather.
Если локальная база уже была создана через `prisma db push`, проще пересоздать ее и затем выполнить `npx prisma migrate deploy`, чтобы история миграций совпадала со схемой.

## Деплой

1. Подключите репозиторий к Vercel.
2. Укажите `DATABASE_URL` на внешнюю PostgreSQL-базу.
3. Добавьте `TELEGRAM_BOT_TOKEN` и `NEXT_PUBLIC_APP_URL` в environment variables проекта.
4. Используйте `npm run vercel-build` как build command.
5. Для ручного CLI-деплоя используйте `npm run deploy:vercel` после входа в Vercel или при наличии `--token`.
6. Для production-базы отдельно запускайте `npm run prisma:migrate:deploy` в среде, где `DATABASE_URL` указывает на доступный PostgreSQL.

## Что реализовано

- Мобильный Mini App интерфейс с разделами рецептов, недельного плана и покупок.
- Демо-рецепты с ингредиентами, граммовками и русскими единицами измерения.
- Агрегация списка покупок с конвертацией `г/кг` и `мл/л`.
- Ручное добавление продуктов и отметка купленных позиций на клиенте.
- Prisma-модель для пользователей, пар, инвайтов, рецептов, плана, продуктов и состояния покупок.
- API skeleton для Telegram auth, рецептов, плана недели и списка покупок.

## Проверка

```bash
npm test
npx prisma generate
npm run build
```
