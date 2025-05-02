export {
  MockReadCallExpectation,
  MockWriteCallExpectation,
  MockRevertExpectation,
  MockCallExpectation,
  MockContract,
  deployMock,
} from "./mock-contract";

export { type MockContract, deployMockContract } from "./compat/waffle.js";
