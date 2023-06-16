const NUMBER = /[0-9]+/;
const RESULT_OPERATOR = /=/
const RESET_OPERATOR = /AC/;
const ARITHMETIC_OPERATORS = /[+\-/*]/;
const EMPTY_LOG = ['0'];
const RESULT = '=';
const ESCAPE_SIGN = '';
const POINT = '.';

const NUMBER_FILTER = item => NUMBER.test(item);
const RESULT_FILTER = item => !RESULT_OPERATOR.test(item);
const LAST_ELEMENT = -1;

function selectAction(data) {
    const {value} = data;
    if (RESET_OPERATOR.test(value)) {
        return reset();
    } else if (RESULT_OPERATOR.test(value)) {
        return calculateResult(data);
    } else {
        return addValue(data);
    }
}

const addLastToLog = ({store}, value) => ({
    value: `${value}`,
    store: {
        ...store,
        operationLog: [...store.operationLog, `${value}`]
    }
})

function addValue(data) {
    const {value, store: {operationLog}} = data;
    const lastElement = operationLog.at(LAST_ELEMENT) || '';
    const isLastNumber = NUMBER.test(lastElement);
    const isValueOperator = ARITHMETIC_OPERATORS.test(value)

    if (isValueOperator && !isLastNumber) {
        operationLog.pop();

        return addLastToLog(data, value);
    } else if(value.includes(POINT)) {
        const last = operationLog.pop();

        return addLastToLog(data, `${last}${value}`);
    } else if (!isValueOperator && isLastNumber) {
        const last = operationLog.pop();

        return addLastToLog(data, Number(`${last}${value}`));
    } else if(RESULT_OPERATOR.test(lastElement)) {
        return data;
    } else {
        return addLastToLog(data, value);
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

    function calculateResult({currentOperation, result}, item) {
        const isNumber = NUMBER.test(item);

        return isNumber ? {
            result: currentOperation
                ? currentOperation(result, item)
                : item,
            currentOperation: null,
        } : {
            result,
            currentOperation: OPERATIONS.get(item),
        }
    }

    function validateResult(result) {
        const isDecimal = !Number.isInteger(result)

        return isDecimal
            ? Number(result).toFixed(2)
            : result;
    }

    const {result} = operationLog
        .filter(RESULT_FILTER)
        .reduce(calculateResult, {result: 0, currentOperation: null})

    return {
        value: ESCAPE_SIGN,
        store: {
            operationLog: [`${validateResult(result)}`, RESULT],
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

function defaultStrategy({operationLog}) {
    return operationLog.filter(NUMBER_FILTER)
        .at(LAST_ELEMENT);
}

function zeroOnChangeOperation({operationLog}) {
    const lastElement = operationLog.at(LAST_ELEMENT);
    const lastNumber = operationLog.filter(NUMBER_FILTER)
        .at(LAST_ELEMENT);

    const isOperator = ARITHMETIC_OPERATORS.test(lastElement);
    return isOperator
        ? '0'
        : lastNumber;
}

function updateView(displayStrategy, data) {
    const {store} = data;
    const display = document.querySelector('.calculator-screen');

    display.innerHTML = displayStrategy(store);
    return data;
}

const calculator = (function (root) {
    const calculatorStore = {
        state: {
            operationLog: [...EMPTY_LOG],
            previousOperations: [],
        }
    };

    function updateStore(rootStore) {
        return function ({store}) {
            rootStore.state = structuredClone(store)
        }
    }

    function setRenderStrategy(strategy) {
        return (state) => updateView(strategy, state);
    }

    const renderStrategy = setRenderStrategy(zeroOnChangeOperation);
    const storeUpdater = updateStore(calculatorStore);



    function handleChanges(event) {
        const start = compose(
            filterEmpty,
            selectAction,
            renderStrategy,
            storeUpdater,
        )
        start({value: event, store: calculatorStore.state});
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
