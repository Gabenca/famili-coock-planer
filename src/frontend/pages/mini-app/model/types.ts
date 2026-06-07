import type {
  createInviteAction,
  createManualShoppingItemAction,
  createMealPlanItemAction,
  createRecipeAction,
  deleteMealPlanItemAction,
  updateMealPlanItemAction,
  updateShoppingCheckStateAction
} from "@/app/actions";
import type { HouseholdMemberView } from "@/entities/household";
import type { MealSlot, PlannedMeal } from "@/entities/meal-plan";
import type { AppRecipe } from "@/entities/recipe";
import type { ManualShoppingItem, ShoppingListItem } from "@/entities/shopping-list";
import type { RecipeIngredient } from "@/lib/shopping-list";

export type InviteStatus = "accepted" | "ignored_existing_household" | "invalid" | "expired" | "none";

export type ReadyAuthState = {
  status: "ready";
  initData: string;
  household: {
    id: string;
    name: string;
    role: "owner" | "member";
  };
  inviteStatus: InviteStatus;
};

export type AuthState =
  | { status: "checking" }
  | { status: "demo"; message: string }
  | ReadyAuthState
  | { status: "error"; message: string };

export type MiniAppInitialData = {
  household: {
    id: string;
    name: string;
    role: "owner" | "member";
    members: HouseholdMemberView[];
  };
  recipes: AppRecipe[];
  planItems: PlannedMeal[];
  shoppingItems: ShoppingListItem[];
};

export type MiniAppState = {
  authState: AuthState;
  dataLoading: boolean;
  dataError: string;
  inviteMessage: string;
  inviteUrl: string;
  inviteLoading: boolean;
  householdMembers: HouseholdMemberView[];
  recipes: AppRecipe[];
  planItems: PlannedMeal[];
  checkedKeys: Set<string>;
  extraItems: ManualShoppingItem[];
  extraName: string;
  extraQuantity: string;
  extraUnit: string;
  remoteShoppingItems: ShoppingListItem[] | null;
};

export type MiniAppStore = MiniAppState & {
  initialize: (initialData?: MiniAppInitialData) => void;
  setAuthState: (authState: AuthState) => void;
  setDemoAuth: () => void;
  setDataLoading: (dataLoading: boolean) => void;
  setDataError: (dataError: string) => void;
  setInviteMessage: (inviteMessage: string) => void;
  setInviteUrl: (inviteUrl: string) => void;
  setInviteLoading: (inviteLoading: boolean) => void;
  setHouseholdMembers: (members: HouseholdMemberView[]) => void;
  setRecipes: (recipes: AppRecipe[]) => void;
  addRecipe: (recipe: AppRecipe) => void;
  setPlanItems: (planItems: PlannedMeal[]) => void;
  addPlanItem: (item: PlannedMeal) => void;
  replacePlanItem: (id: string, item: PlannedMeal) => void;
  updatePlanItemServings: (id: string, servingsMultiplier: number) => PlannedMeal | undefined;
  removePlanItem: (id: string) => PlannedMeal | undefined;
  restorePlanItem: (item: PlannedMeal) => void;
  setCheckedKeys: (checkedKeys: Set<string>) => void;
  toggleLocalCheckedKey: (key: string) => void;
  setExtraItems: (extraItems: ManualShoppingItem[]) => void;
  addExtraItem: (item: ManualShoppingItem) => void;
  updateExtraItemQuantity: (id: string, quantity: number) => void;
  setExtraName: (extraName: string) => void;
  setExtraQuantity: (extraQuantity: string) => void;
  setExtraUnit: (extraUnit: string) => void;
  resetExtraForm: () => void;
  setRemoteShoppingItems: (items: ShoppingListItem[] | null) => void;
  updateRemoteShoppingItemChecked: (key: string, checked: boolean) => void;
  updateRemoteManualQuantity: (id: string, quantity: number) => void;
  clearAuthenticatedClientData: (authState: ReadyAuthState) => void;
};

export type WorkflowActions = {
  createInviteAction: typeof createInviteAction;
  createManualShoppingItemAction: typeof createManualShoppingItemAction;
  createMealPlanItemAction: typeof createMealPlanItemAction;
  createRecipeAction: typeof createRecipeAction;
  deleteMealPlanItemAction: typeof deleteMealPlanItemAction;
  updateMealPlanItemAction: typeof updateMealPlanItemAction;
  updateShoppingCheckStateAction: typeof updateShoppingCheckStateAction;
};

export type WorkflowDependencies = WorkflowActions & {
  fetch: typeof fetch;
  getTelegramLaunchParams: () => {
    initData?: string;
    inviteToken?: string;
  };
  clipboard?: Pick<Clipboard, "writeText">;
  now: () => number;
};

export type AddRecipeInput = {
  title: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  photoUrl?: string;
};

export type AddMealInput = {
  date: string;
  slot: MealSlot;
  recipeId: string;
};
