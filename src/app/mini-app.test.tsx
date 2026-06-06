import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { MiniApp } from "./mini-app";

describe("MiniApp", () => {
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

  it("lets users add multiple recipes to a meal slot", () => {
    render(<MiniApp />);

    fireEvent.click(screen.getByRole("button", { name: "Неделя" }));
    expect(screen.getAllByText("Полдник").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Добавить рецепт в обед" })[0]);

    expect(screen.getAllByLabelText("Количество для Боул с лососем и рисом")).toHaveLength(2);
  });

  it("lets users add recipes with ingredients and plan them", () => {
    render(<MiniApp />);

    fireEvent.change(screen.getByLabelText("Название рецепта"), { target: { value: "Сырники" } });
    expect(screen.getByLabelText("Фото рецепта")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Рецепт приготовления"), { target: { value: "Смешать творог с яйцом, сформировать сырники и обжарить." } });
    fireEvent.change(screen.getByLabelText("Название ингредиента 1"), { target: { value: "Творог" } });
    fireEvent.change(screen.getByLabelText("Количество ингредиента 1"), { target: { value: "400" } });
    fireEvent.change(screen.getByLabelText("Единица ингредиента 1"), { target: { value: "г" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить рецепт" }));

    expect(screen.getByRole("heading", { name: "Сырники" })).toBeInTheDocument();
    expect(screen.getByText("400 г Творог")).toBeInTheDocument();
    expect(screen.getByText("Смешать творог с яйцом, сформировать сырники и обжарить.")).toBeInTheDocument();

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
    fireEvent.change(screen.getByLabelText("Единица продукта"), { target: { value: "г" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить продукт" }));

    expect(screen.getByLabelText("Количество Миндаль")).toHaveValue(3);
    expect(screen.getAllByText("г").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: "Увеличить Миндаль" }));

    expect(screen.getByLabelText("Количество Миндаль")).toHaveValue(4);
  });
});
