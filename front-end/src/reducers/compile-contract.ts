import EReducerState from '@/constants/reducer-state';

const compileContractInitialState = {
  isLoading: false,
  isError: false,
  isSuccess: false,
  artifact: null as string | null
};

type TCompileContractState = typeof compileContractInitialState;

interface ICompileContractAction {
  state: EReducerState;
  payload: string | null;
}

function compileContractReducer(state: TCompileContractState, action: ICompileContractAction) {
  switch (action.state) {
    case EReducerState.start: {
      return {
        isLoading: true,
        isError: false,
        isSuccess: false,
        artifact: null
      };
    }
    case EReducerState.success: {
      return {
        isLoading: false,
        isError: false,
        isSuccess: true,
        artifact: action.payload
      };
    }
    case EReducerState.error: {
      return {
        isLoading: false,
        isError: true,
        isSuccess: false,
        artifact: null
      };
    }
    case EReducerState.reset: {
      return {
        isLoading: false,
        isError: false,
        isSuccess: false,
        artifact: null
      };
    }
    default: {
      return state;
    }
  }
}

export type { TCompileContractState, ICompileContractAction };
export { compileContractInitialState, compileContractReducer };
