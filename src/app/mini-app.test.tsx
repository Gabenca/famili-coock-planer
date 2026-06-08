import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { demoWeekDates } from "@/data/demo";
import { MiniApp } from "@/frontend/pages/mini-app";
import { resetMiniAppStore } from "@/frontend/pages/mini-app/model";

const actionMocks = vi.hoisted(() => ({
  createManualShoppingItemAction: vi.fn(),
  createInviteAction: vi.fn(),
  createMealPlanItemAction: vi.fn(),
  createRecipeAction: vi.fn(),
  deleteMealPlanItemAction: vi.fn(),
  updateRecipePhotoAction: vi.fn(),
  updateMealPlanItemAction: vi.fn(),
  updateShoppingCheckStateAction: vi.fn()
}));

vi.mock("@/app/actions", () => ({
  createManualShoppingItemAction: actionMocks.createManualShoppingItemAction,
  createInviteAction: actionMocks.createInviteAction,
  createMealPlanItemAction: actionMocks.createMealPlanItemAction,
  createRecipeAction: actionMocks.createRecipeAction,
  deleteMealPlanItemAction: actionMocks.deleteMealPlanItemAction,
  updateRecipePhotoAction: actionMocks.updateRecipePhotoAction,
  updateMealPlanItemAction: actionMocks.updateMealPlanItemAction,
  updateShoppingCheckStateAction: actionMocks.updateShoppingCheckStateAction
}));

describe("MiniApp", () => {
  beforeEach(() => {
    actionMocks.createInviteAction.mockReset();
    actionMocks.createManualShoppingItemAction.mockReset();
    actionMocks.createMealPlanItemAction.mockReset();
    actionMocks.createRecipeAction.mockReset();
    actionMocks.deleteMealPlanItemAction.mockReset();
    actionMocks.updateRecipePhotoAction.mockReset();
    actionMocks.updateMealPlanItemAction.mockReset();
    actionMocks.updateShoppingCheckStateAction.mockReset();
    actionMocks.createManualShoppingItemAction.mockResolvedValue({ item: { id: "manual-1", name: "Кофе", quantity: 1, unit: "шт" } });
    actionMocks.createMealPlanItemAction.mockResolvedValue({
      item: {
        id: "remote-plan",
        date: demoWeekDates[0],
        slot: "breakfast",
        recipeId: "remote-recipe",
        servingsMultiplier: 1
      }
    });
    actionMocks.createRecipeAction.mockResolvedValue({
      recipe: {
        id: "remote-syrniki",
        title: "Сырники",
        instructions: "Смешать и обжарить.",
        servings: 2,
        ingredients: [{ productId: "curd", name: "Творог", quantity: 400, unit: "г" }]
      }
    });
    actionMocks.deleteMealPlanItemAction.mockResolvedValue({ deleted: true });
    actionMocks.updateMealPlanItemAction.mockResolvedValue({
      item: {
        id: "remote-plan",
        date: demoWeekDates[0],
        slot: "breakfast",
        recipeId: "remote-recipe",
        servingsMultiplier: 2
      }
    });
    actionMocks.updateShoppingCheckStateAction.mockResolvedValue({ checkState: { itemKey: "manual:coffee", checked: true } });
  });

  afterEach(() => {
    delete window.Telegram;
    resetMiniAppStore();
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("renders the Russian recipe planner, weekly plan, and shopping list in the first screen", () => {
    render(<MiniApp />);

    expect(screen.getByRole("heading", { name: "Кухня для двоих" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Рецепты" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Неделя" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Покупки" })).toBeInTheDocument();
    expect(screen.getByText("Боул с лососем и рисом")).toBeInTheDocument();
    expect(screen.getByText("Понедельник")).toBeInTheDocument();
    expect(screen.getByText("Кофе в зернах")).toBeInTheDocument();
  });

  it("shows invite controls with demo status outside Telegram", async () => {
    render(<MiniApp />);

    fireEvent.click(screen.getByRole("button", { name: "Открыть семью" }));

    expect(await screen.findAllByText("Демо режим")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Создать ссылку приглашения" })).toBeInTheDocument();
  });

  it("opens the family screen from the people icon", async () => {
    render(<MiniApp />);

    fireEvent.click(screen.getByRole("button", { name: "Открыть семью" }));

    expect(await screen.findByRole("heading", { name: "Семья" })).toBeInTheDocument();
    expect(screen.getAllByText("Демо режим")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Назад к приложению" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Назад к приложению" }));

    expect(screen.getByRole("heading", { name: "Кухня для двоих" })).toBeInTheDocument();
  });

  it("uses the tab search param as the initial active tab", () => {
    window.history.replaceState(null, "", "/?tab=shop");

    render(<MiniApp />);

    expect(screen.getByText("Кофе в зернах")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Боул с лососем и рисом" })).not.toBeInTheDocument();
  });

  it("updates the tab search param when switching tabs", () => {
    render(<MiniApp />);

    fireEvent.click(screen.getByRole("button", { name: "Покупки" }));

    expect(window.location.search).toBe("?tab=shop");
  });

  it("uses the family screen search param as the initial screen", async () => {
    window.history.replaceState(null, "", "/?screen=family");

    render(<MiniApp />);

    expect(await screen.findByRole("heading", { name: "Семья" })).toBeInTheDocument();
  });

  it("authenticates from Telegram launch params in the URL hash", async () => {
    const fetchMock = mockAuthenticatedFetch();
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash&tgWebAppStartParam=invite-1");

    render(<MiniApp />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/telegram",
        expect.objectContaining({
          body: JSON.stringify({ inviteToken: "invite-1" }),
          headers: expect.objectContaining({
            authorization: "tma query_id=abc&user=%7B%22id%22%3A42%7D&auth_date=1&hash=hash"
          })
        })
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Открыть семью" }));
    expect(screen.getAllByText("Наша кухня")).toHaveLength(2);
  });

  it("starts with an empty planner after Telegram auth instead of demo seed data", async () => {
    mockAuthenticatedFetch();
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);

    await waitFor(() => {
      expect(window.fetch).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Боул с лососем/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Кофе в зернах/)).not.toBeInTheDocument();
    expect(screen.getAllByText("0", { selector: ".text-xl" })).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Неделя" }));
    expect(screen.queryByLabelText("Количество для Боул с лососем и рисом")).not.toBeInTheDocument();
  });

  it("loads household recipes, plan, and shopping items after Telegram auth", async () => {
    mockAuthenticatedFetch({
      recipes: [
        {
          id: "remote-recipe",
          title: "Гречка с грибами",
          instructions: "Сварить гречку и обжарить грибы.",
          servings: 2,
          ingredients: [{ productId: "buckwheat", name: "Гречка", quantity: 300, unit: "г" }]
        }
      ],
      plan: [
        {
          id: "remote-plan",
          date: "2026-06-08",
          slot: "dinner",
          recipeId: "remote-recipe",
          servingsMultiplier: 1
        }
      ],
      shopping: [
        {
          key: "generated:buckwheat:г",
          name: "Гречка",
          quantity: 300,
          unit: "г",
          source: "generated",
          checked: false
        }
      ]
    });
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);

    expect(await screen.findByRole("heading", { name: "Гречка с грибами" })).toBeInTheDocument();
    expect(screen.queryByText(/Боул с лососем/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Покупки" }));
    expect(screen.getByText("Гречка")).toBeInTheDocument();
  });

  it("shows household members in the family screen", async () => {
    mockAuthenticatedFetch({
      members: [
        {
          id: "user-1",
          firstName: "Максим",
          lastName: null,
          username: "max",
          role: "owner"
        }
      ]
    });
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);
    await waitFor(() => expect(window.fetch).toHaveBeenCalledWith("/api/household", expect.any(Object)));

    fireEvent.click(screen.getByRole("button", { name: "Открыть семью" }));

    expect(await screen.findByText("Максим")).toBeInTheDocument();
    expect(screen.getByText("@max")).toBeInTheDocument();
    expect(screen.getByText("владелец")).toBeInTheDocument();
  });

  it("creates invites through the server action instead of the invites API", async () => {
    const fetchMock = mockAuthenticatedFetch();
    actionMocks.createInviteAction.mockResolvedValue({
      invite: {
        token: "invite-1",
        expiresAt: new Date("2026-06-14T00:00:00.000Z"),
        url: "https://t.me/couple/app?startapp=invite-1"
      }
    });
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/household", expect.any(Object)));
    fireEvent.click(screen.getByRole("button", { name: "Открыть семью" }));
    fireEvent.click(await screen.findByRole("button", { name: "Создать ссылку приглашения" }));

    await waitFor(() => expect(actionMocks.createInviteAction).toHaveBeenCalled());
    expect(fetchMock).not.toHaveBeenCalledWith("/api/invites", expect.any(Object));
    expect(await screen.findByText("https://t.me/couple/app?startapp=invite-1")).toBeInTheDocument();
  });

  it("creates recipes through the server action instead of the recipes API", async () => {
    const fetchMock = mockAuthenticatedFetch({
      createdRecipe: {
        id: "remote-syrniki",
        title: "Сырники",
        instructions: "Смешать и обжарить.",
        servings: 2,
        ingredients: [{ productId: "curd", name: "Творог", quantity: 400, unit: "г" }]
      }
    });
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/recipes", expect.objectContaining({ headers: expect.any(Object) })));

    fireEvent.change(screen.getByLabelText("Название рецепта"), { target: { value: "Сырники" } });
    fireEvent.change(screen.getByLabelText("Рецепт приготовления"), { target: { value: "Смешать и обжарить." } });
    fireEvent.change(screen.getByLabelText("Название ингредиента 1"), { target: { value: "Творог" } });
    fireEvent.change(screen.getByLabelText("Количество ингредиента 1"), { target: { value: "400" } });
    fireEvent.change(screen.getByLabelText("Единица ингредиента 1"), { target: { value: "г" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить рецепт" }));

    await waitFor(() =>
      expect(actionMocks.createRecipeAction).toHaveBeenCalledWith({
        title: "Сырники",
        instructions: "Смешать и обжарить.",
        servings: 2,
        ingredients: [{ name: "Творог", quantity: 400, unit: "г" }]
      })
    );
    expect(fetchMock).not.toHaveBeenCalledWith("/api/recipes", expect.objectContaining({ method: "POST" }));
    expect(await screen.findByRole("heading", { name: "Сырники" })).toBeInTheDocument();
  });

  it("adds meal plan items through the server action instead of the meal plan API", async () => {
    const fetchMock = mockAuthenticatedFetch({
      recipes: [
        {
          id: "remote-recipe",
          title: "Омлет",
          instructions: "Взбить яйца.",
          servings: 2,
          ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
        }
      ],
      createdMeal: {
        id: "remote-plan",
        date: "2026-06-08",
        slot: "breakfast",
        recipeId: "remote-recipe",
        servingsMultiplier: 1
      }
    });
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);
    expect(await screen.findByRole("heading", { name: "Омлет" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Неделя" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Добавить рецепт в завтрак" })[0]);

    await waitFor(() => expect(actionMocks.createMealPlanItemAction).toHaveBeenCalledWith({ date: demoWeekDates[0], slot: "breakfast", recipeId: "remote-recipe", servingsMultiplier: 1 }));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/meal-plans", expect.objectContaining({ method: "POST" }));
  });

  it("updates and removes meal plan items through server actions", async () => {
    const fetchMock = mockAuthenticatedFetch({
      recipes: [
        {
          id: "remote-recipe",
          title: "Омлет",
          instructions: "Взбить яйца.",
          servings: 2,
          ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
        }
      ],
      plan: [
        {
          id: "remote-plan",
          date: demoWeekDates[0],
          slot: "breakfast",
          recipeId: "remote-recipe",
          servingsMultiplier: 1
        }
      ]
    });
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);
    fireEvent.click(screen.getByRole("button", { name: "Неделя" }));
    expect(await screen.findByLabelText("Количество для Омлет")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Количество для Омлет"), { target: { value: "2" } });
    await waitFor(() => expect(actionMocks.updateMealPlanItemAction).toHaveBeenCalledWith({ itemId: "remote-plan", servingsMultiplier: 2 }));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/meal-plans/remote-plan", expect.objectContaining({ method: "PATCH" }));

    fireEvent.click(screen.getByRole("button", { name: "Убрать Омлет" }));
    await waitFor(() => expect(actionMocks.deleteMealPlanItemAction).toHaveBeenCalledWith({ itemId: "remote-plan" }));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/meal-plans/remote-plan", expect.objectContaining({ method: "DELETE" }));
  });

  it("optimistically adds authenticated meal plan items before the action resolves", async () => {
    const createResponse = createDeferred<Awaited<ReturnType<typeof actionMocks.createMealPlanItemAction>>>();
    mockAuthenticatedFetch({
      recipes: [
        {
          id: "remote-recipe",
          title: "Омлет",
          instructions: "Взбить яйца.",
          servings: 2,
          ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
        }
      ]
    });
    actionMocks.createMealPlanItemAction.mockReturnValue(createResponse.promise);
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);
    expect(await screen.findByRole("heading", { name: "Омлет" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Неделя" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Добавить рецепт в завтрак" })[0]);

    expect(screen.getByLabelText("Количество для Омлет")).toHaveValue(1);
    await act(async () => {
      createResponse.resolve({
        item: {
          id: "remote-plan",
          date: demoWeekDates[0],
          slot: "breakfast",
          recipeId: "remote-recipe",
          servingsMultiplier: 1
        }
      });
      await createResponse.promise;
    });
  });

  it("optimistically updates and removes authenticated meal plan items before actions resolve", async () => {
    const updateResponse = createDeferred<Awaited<ReturnType<typeof actionMocks.updateMealPlanItemAction>>>();
    const deleteResponse = createDeferred<Awaited<ReturnType<typeof actionMocks.deleteMealPlanItemAction>>>();
    mockAuthenticatedFetch({
      recipes: [
        {
          id: "remote-recipe",
          title: "Омлет",
          instructions: "Взбить яйца.",
          servings: 2,
          ingredients: [{ productId: "egg", name: "Яйца", quantity: 4, unit: "шт" }]
        }
      ],
      plan: [
        {
          id: "remote-plan",
          date: demoWeekDates[0],
          slot: "breakfast",
          recipeId: "remote-recipe",
          servingsMultiplier: 1
        }
      ]
    });
    actionMocks.updateMealPlanItemAction.mockReturnValue(updateResponse.promise);
    actionMocks.deleteMealPlanItemAction.mockReturnValue(deleteResponse.promise);
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);
    fireEvent.click(screen.getByRole("button", { name: "Неделя" }));
    expect(await screen.findByLabelText("Количество для Омлет")).toHaveValue(1);

    fireEvent.change(screen.getByLabelText("Количество для Омлет"), { target: { value: "2" } });
    expect(screen.getByLabelText("Количество для Омлет")).toHaveValue(2);
    await act(async () => {
      updateResponse.resolve({
        item: {
          id: "remote-plan",
          date: demoWeekDates[0],
          slot: "breakfast",
          recipeId: "remote-recipe",
          servingsMultiplier: 2
        }
      });
      await updateResponse.promise;
    });

    fireEvent.click(screen.getByRole("button", { name: "Убрать Омлет" }));
    expect(screen.queryByLabelText("Количество для Омлет")).not.toBeInTheDocument();
    await act(async () => {
      deleteResponse.resolve({ deleted: true });
      await deleteResponse.promise;
    });
  });

  it("persists checked shopping state through the authenticated shopping API", async () => {
    const fetchMock = mockAuthenticatedFetch({
      shopping: [
        {
          key: "manual:coffee",
          name: "Кофе",
          quantity: 1,
          unit: "шт",
          source: "manual",
          checked: false
        }
      ]
    });
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);
    fireEvent.click(screen.getByRole("button", { name: "Покупки" }));
    expect(await screen.findByText("Кофе")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Отметить Кофе" }));

    await waitFor(() => expect(actionMocks.updateShoppingCheckStateAction).toHaveBeenCalledWith({ weekStart: demoWeekDates[0], itemKey: "manual:coffee", checked: true }));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/shopping-list", expect.objectContaining({ method: "PATCH" }));
  });

  it("optimistically toggles authenticated shopping items before the shopping API resolves", async () => {
    const patchResponse = createDeferred<Awaited<ReturnType<typeof actionMocks.updateShoppingCheckStateAction>>>();
    vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url === "/api/auth/telegram") {
        return jsonResponse({
          household: {
            id: "household-1",
            name: "Наша кухня",
            role: "owner"
          },
          inviteStatus: "none"
        });
      }

      if (url === "/api/household") {
        return jsonResponse({ household: { id: "household-1", name: "Наша кухня", role: "owner", members: [] } });
      }

      if (url === "/api/recipes") {
        return jsonResponse({ recipes: [] });
      }

      if (url.startsWith("/api/meal-plans")) {
        return jsonResponse({ plan: [] });
      }

      if (url.startsWith("/api/shopping-list")) {
        return jsonResponse({
          items: [
            {
              key: "manual:coffee",
              name: "Кофе",
              quantity: 1,
              unit: "шт",
              source: "manual",
              checked: false
            }
          ]
        });
      }

      return jsonResponse({}, false);
    });
    actionMocks.updateShoppingCheckStateAction.mockReturnValue(patchResponse.promise);
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);
    fireEvent.click(screen.getByRole("button", { name: "Покупки" }));
    expect(await screen.findByRole("button", { name: "Отметить Кофе" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Отметить Кофе" }));

    expect(screen.getByRole("button", { name: "Вернуть Кофе" })).toBeInTheDocument();
    await act(async () => {
      patchResponse.resolve({ checkState: { itemKey: "manual:coffee", checked: true } });
      await patchResponse.promise;
    });
  });

  it("adds authenticated manual shopping items through the server action", async () => {
    const fetchMock = mockAuthenticatedFetch();
    actionMocks.createManualShoppingItemAction.mockResolvedValue({ item: { id: "manual-tea", name: "Чай", quantity: 2, unit: "шт" } });
    window.history.replaceState(null, "", "/#tgWebAppData=query_id%3Dabc%26user%3D%257B%2522id%2522%253A42%257D%26auth_date%3D1%26hash%3Dhash");

    render(<MiniApp />);
    fireEvent.click(screen.getByRole("button", { name: "Покупки" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/shopping-list"), expect.any(Object)));
    fireEvent.change(screen.getByLabelText("Дополнительный продукт"), { target: { value: "Чай" } });
    fireEvent.change(screen.getByLabelText("Количество продукта"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить продукт" }));

    await waitFor(() => expect(actionMocks.createManualShoppingItemAction).toHaveBeenCalledWith({ weekStart: demoWeekDates[0], name: "Чай", quantity: 2, unit: "шт" }));
    expect(fetchMock).not.toHaveBeenCalledWith("/api/shopping-list", expect.objectContaining({ method: "POST" }));
  });

  it("lets users add multiple recipes to a meal slot", () => {
    render(<MiniApp />);

    fireEvent.click(screen.getByRole("button", { name: "Неделя" }));
    expect(screen.getAllByText("Полдник").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Добавить рецепт в обед" })[0]);

    expect(screen.getAllByLabelText("Количество для Боул с лососем и рисом")).toHaveLength(2);
  });

  it("lets users add recipes with ingredients and plan them", async () => {
    render(<MiniApp />);

    fireEvent.change(screen.getByLabelText("Название рецепта"), { target: { value: "Сырники" } });
    expect(screen.getByLabelText("Фото рецепта")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Рецепт приготовления"), { target: { value: "Смешать творог с яйцом, сформировать сырники и обжарить." } });
    fireEvent.change(screen.getByLabelText("Название ингредиента 1"), { target: { value: "Творог" } });
    fireEvent.change(screen.getByLabelText("Количество ингредиента 1"), { target: { value: "400" } });
    expect(screen.getByRole("combobox", { name: "Единица ингредиента 1" })).toHaveDisplayValue("шт");
    expect(screen.getByRole("option", { name: "ст. л." })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "ч. л." })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "щепотка" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Единица ингредиента 1"), { target: { value: "г" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить рецепт" }));

    expect(await screen.findByRole("heading", { name: "Сырники" })).toBeInTheDocument();
    expect(screen.getByText("400 г Творог")).toBeInTheDocument();
    expect(screen.getAllByText("Смешать творог с яйцом, сформировать сырники и обжарить.").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Неделя" }));
    fireEvent.change(screen.getAllByLabelText("Рецепт для завтрак")[0], { target: { value: "syrniki" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Добавить рецепт в завтрак" })[0]);

    expect(screen.getByLabelText("Количество для Сырники")).toBeInTheDocument();
  });

  it("lets users choose quantities for manually added products", () => {
    render(<MiniApp />);

    fireEvent.click(screen.getByRole("button", { name: "Покупки" }));
    fireEvent.change(screen.getByLabelText("Дополнительный продукт"), { target: { value: "Миндаль" } });
    fireEvent.change(screen.getByLabelText("Количество продукта"), { target: { value: "3" } });
    expect(screen.getByRole("combobox", { name: "Единица продукта" })).toHaveDisplayValue("шт");
    expect(screen.getByRole("option", { name: "ст. л." })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "ч. л." })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "щепотка" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Единица продукта"), { target: { value: "г" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить продукт" }));

    expect(screen.getByLabelText("Количество Миндаль")).toHaveValue(3);
    expect(screen.getAllByText("г").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "Увеличить Миндаль" }));

    expect(screen.getByLabelText("Количество Миндаль")).toHaveValue(4);
  });
});

function mockAuthenticatedFetch({
  members = [],
  recipes = [],
  plan = [],
  shopping = [],
  createdRecipe,
  createdMeal
}: {
  members?: unknown[];
  recipes?: unknown[];
  plan?: unknown[];
  shopping?: unknown[];
  createdRecipe?: unknown;
  createdMeal?: unknown;
} = {}) {
  return vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);

    if (url === "/api/auth/telegram") {
      return jsonResponse({
        household: {
          id: "household-1",
          name: "Наша кухня",
          role: "owner"
        },
        inviteStatus: "none"
      });
    }

    if (url === "/api/household") {
      return jsonResponse({
        household: {
          id: "household-1",
          name: "Наша кухня",
          role: "owner",
          members
        }
      });
    }

    if (url === "/api/recipes") {
      if (init?.method === "POST") {
        return jsonResponse({ recipe: createdRecipe });
      }

      return jsonResponse({ recipes });
    }

    if (url.startsWith("/api/meal-plans")) {
      if (init?.method === "POST") {
        return jsonResponse({ item: createdMeal });
      }

      return jsonResponse({ plan });
    }

    if (url.startsWith("/api/shopping-list")) {
      if (init?.method === "PATCH") {
        return jsonResponse({ checkState: { itemKey: "manual:coffee", checked: true } });
      }

      if (init?.method === "POST") {
        return jsonResponse({ item: { id: "manual-1", name: "Кофе", quantity: 1, unit: "шт" } });
      }

      return jsonResponse({ items: shopping });
    }

    return jsonResponse({}, false);
  });
}

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body
  } as Response;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });

  return {
    promise,
    resolve
  };
}
