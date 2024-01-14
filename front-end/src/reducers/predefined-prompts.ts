import type { TPrompt } from '@/sdk/src/db-schemas/prompts';

import EReducerState from '@/constants/reducer-state';

const predefinedPromptsInitialState = {
  isLoading: false,
  isError: false,
  isSuccess: false,
  prompts: [] as TPrompt[] | null
};

type TPredefinedPromptsState = typeof predefinedPromptsInitialState;

interface IPredefinedPromptsAction {
  state: EReducerState;
  payload: TPrompt[] | null;
}

function predefinedPromptsReducer(
  state: TPredefinedPromptsState,
  action: IPredefinedPromptsAction
) {
  switch (action.state) {
    case EReducerState.start: {
      return {
        isLoading: true,
        isError: false,
        isSuccess: false,
        prompts: null
      };
    }
    case EReducerState.success: {
      return {
        isLoading: false,
        isError: false,
        isSuccess: true,
        prompts: action.payload
      };
    }
    case EReducerState.error: {
      return {
        isLoading: false,
        isError: true,
        isSuccess: false,
        prompts: null
      };
    }
    case EReducerState.reset: {
      return {
        isLoading: false,
        isError: false,
        isSuccess: false,
        prompts: null
      };
    }
    default: {
      return state;
    }
  }
}

export type { TPredefinedPromptsState, IPredefinedPromptsAction };
export { predefinedPromptsInitialState, predefinedPromptsReducer };
