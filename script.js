const NUMBER = /[0-9]+/;
const RESULT_OPERATOR = /[=]/
const arithmetic_operators = /[=]/
const POINT = '.'
const RESET_OPERATOR = /AC/;
const EMPTY_LOG = ['0'];
const RESULT = '=';
const ESCAPE_SIGN = '';

const NUMBER_FILTER = item => NUMBER.test(item);
const RESULT_FILTER = item => !RESULT_OPERATOR.test(item);
const LAST_ELEMENT = -1;

function changeOperation(data) {
    const {value, store} = data;
    const {operationLog} = store;
    const lastIndex = operationLog.length - 1;
    operationLog[lastIndex] = value;

    return data
}

function selectAction(data) {
    const {value, store: {operationLog}} = data;
    const lastIndex = operationLog.length - 1;
    const lastItem = operationLog[lastIndex];
    const {
        isLastNumber,
        isNewValueNumber,
        isValuePoint,
        isValueReset,
        isValueResult,
        isNeedAddValue,
        isNeedToAddNewValue
    } = checkInput({
        lastItem,
        value
    });

    if (isValueReset) {
        return reset()
    } else if (isValueResult && operationLog.length > 2) {
        return calculateResult(data);
    } else if (!isValueResult && isNeedAddValue) {
        return changeValue({...data, isValuePoint, lastItem, lastIndex});
    } else if (!isValueResult && isNeedToAddNewValue) {
        return addNewValue(data);
    } else if (!isLastNumber && !isNewValueNumber) {
        return changeOperation(data);
    }

    return data;
}

function addNewValue(data) {
    const {value, store} = data;
    const {operationLog} = store;

    return {
        value,
        store: {
            ...store,
            operationLog: [...operationLog, value]
        }
    }
}

function changeValue(data) {
    const {value, store, isValuePoint, lastItem, lastIndex} = data;
    const {operationLog} = store;

    operationLog[lastIndex] = isValuePoint
        ? `${lastItem}${value}`
        : `${Number(`${lastItem}${value}`)}`;
    return data;
}

function checkInput({lastItem, value}) {
    const [isLastNumber, isNewValueNumber] = [lastItem, value].map(NUMBER_FILTER);
    const isValuePoint = value.includes(POINT);
    const isLastItemIsNotContainPoint = !lastItem.includes(POINT);
    const isValueResult = RESULT_OPERATOR.test(value);
    const isValueReset = RESET_OPERATOR.test(value);
    const isNeedAddValue = isLastItemIsNotContainPoint && isValuePoint || isLastNumber && isNewValueNumber;
    const isNeedToAddNewValue = isLastNumber && !isNewValueNumber || !isLastNumber && isNewValueNumber;

    return {
        isLastNumber,
        isNewValueNumber,
        isValuePoint,
        isValueResult,
        isValueReset,
        isNeedAddValue,
        isNeedToAddNewValue
    }
}

function compose(...actions) {
    return function (providedArguments) {
        return actions
            .reduce((arguments, func) => func(arguments), providedArguments);
    }
}

function calculateResult(data) {
    const {store} = data;
    const OPERATIONS = new Map();
    OPERATIONS.set('+', (first, second) => Number(first) + Number(second));
    OPERATIONS.set('-', (first, second) => Number(first) - Number(second));
    OPERATIONS.set('/', (first, second) => Number(first) / Number(second));
    OPERATIONS.set('*', (first, second) => Number(first) * Number(second));

    const {previousOperations, operationLog} = store;
    const {result} = operationLog
        .filter(RESULT_FILTER)
        .reduce((accumulator, operand) => {
            const {currentOperation, result} = accumulator;
            const isNumber = NUMBER.test(operand);

            if (isNumber && currentOperation) {
                return {
                    result: currentOperation(result, operand),
                    currentOperation: null,
                }
            } else if (isNumber && !currentOperation) {
                return {
                    result: operand,
                    currentOperation: null,
                }
            } else {
                return {
                    result,
                    currentOperation: OPERATIONS.get(operand),
                }
            }
        }, {result: 0, currentOperation: null})

    return {
        value: ESCAPE_SIGN,
        store: {
            operationLog: [`${result}`, RESULT],
            previousOperations: operationLog.length > 1 && !operationLog.includes(RESULT)
                ? [...previousOperations, operationLog]
                : previousOperations,
        },
    }
}

function reset() {
    return {
        value: ESCAPE_SIGN,
        store: {
            operationLog: [...EMPTY_LOG],
            previousOperations: []
        }
    };
}

function filterEmpty(data) {
    const {value: {target}, store} = data
    const result = target.getAttribute('data-value');
    return {value: result ?? ESCAPE_SIGN, store}
}

function updateView(data) {
    const {store} = data;
    const display = document.querySelector('.calculator-screen');

    display.innerHTML = store.operationLog
        .filter(NUMBER_FILTER)
        .at(LAST_ELEMENT);

    return data;
}

const calculator = (function (root) {
    const store = {
        operationLog: [...EMPTY_LOG],
        previousOperations: [],
    };

    function updateStore(rootStore) {
        return function ({store: {operationLog, previousOperations}}) {
            rootStore.operationLog = operationLog;
            rootStore.previousOperations = previousOperations;
        }
    }

    const storeUpdater = updateStore(store);

    function handleChanges(event) {

        const start = compose(
            filterEmpty,
            selectAction,
            updateView,
            storeUpdater,
        )
        console.log(store);
        start({value: event, store});
    }

    function runApp(selector) {
        const controlButtons = root.querySelector(selector)
        controlButtons.addEventListener('click', handleChanges);
    }

    return {
        runApp
    }
})(document)

calculator.runApp('.calculator-keys')
