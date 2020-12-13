// ==UserScript==
// @name        Steam Quick sell
// @icon        https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg
// @namespace   https://github.com/Nuklon
// @author      Nuklon
// @license     MIT
// @version     6.8.2
// @description Enhances the Steam Inventory and Steam Market.
// @include     *://steamcommunity.com/id/*/inventory*
// @include     *://steamcommunity.com/profiles/*/inventory*
// @include     *://steamcommunity.com/market*
// @include     *://steamcommunity.com/tradeoffer*
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @require     https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/async/2.6.0/async.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/localforage/1.7.1/localforage.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/list.js/1.5.0/list.js
// @grant       unsafeWindow
// ==/UserScript==
// jQuery is already added by Steam, force no conflict mode.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var pages;
(function (pages) {
    pages["Market"] = "market";
    pages["Inventory"] = "inventory";
})(pages || (pages = {}));
const localStorageMap = {
    isFixed: "stm.plg.isFixed",
    value: "stm.plg.value",
};
const idsMap = {
    productName: "stm.plg.product.name",
    productValue: "stm.plg.product.value",
    productId: "stm.plg.product.id",
    modifyInput: "stm.plg.modify.input",
    modifyButton: "stm.plg.modify.button",
    modifyTypeFixed: "stm.plg.modify.type.fixed",
    modifyTypePercent: "stm.plg.modify.type.percent",
    sellItem: "stm.plg.modify.sell.item",
};
const country = "BR";
const language = "brazilian";
const currencyId = 7;
let productDetail = {
    id: "",
    name: "",
    value: "",
};
var ModifierType;
(function (ModifierType) {
    ModifierType["Fixed"] = "fixed";
    ModifierType["Percent"] = "percet";
})(ModifierType || (ModifierType = {}));
let currentPage = pages.Market;
let modifierType = ModifierType.Fixed;
let modifierValue = "";
const sleep = (time) => __awaiter(this, void 0, void 0, function* () {
    return yield new Promise((resolve) => {
        setTimeout(() => resolve({}), time);
    });
});
const getMarketElementById = (element, type = "id") => {
    const prefix = type === "class" ? "." : "";
    if (currentPage === pages.Inventory)
        //@ts-ignore
        return window.parent.$(prefix + element);
    return $(prefix + element);
};
const getInventoryElementById = (element, type = "id") => {
    const prefix = type === "class" ? "." : "";
    return $(prefix + element);
};
const getCurrentItemOrdersHistogram = (itemId) => {
    return new Promise((resolve, reject) => {
        var url = window.location.protocol +
            "//steamcommunity.com/market/itemordershistogram?language=english&currency=" +
            currencyId +
            "&item_nameid=" +
            itemId +
            "&two_factor=0";
        $.get(url, function (histogram) {
            resolve(histogram);
        }).fail(function () {
            reject({});
        });
    });
};
const getCurrentMarketItemNameId = (appid, market_name) => __awaiter(this, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        var url = window.location.protocol +
            "//steamcommunity.com/market/listings/" +
            appid +
            "/" +
            market_name;
        $.get(url, function (page) {
            var matches = /Market_LoadOrderSpread\( (.+) \);/.exec(page);
            var item_nameid = matches[1];
            resolve(item_nameid);
        }).fail(function (error) {
            alert(error);
        });
    });
});
const calculateValue = (value, modifierType, productValue) => {
    const isFixed = modifierType === ModifierType.Fixed;
    const calculatedValue = parseFloat(value.replace(",", "."));
    const variableValue = parseFloat(productValue);
    console.log(calculatedValue, productValue);
    if (isFixed) {
        return (variableValue + calculatedValue) / 100;
    }
    return (variableValue * (1 + calculatedValue / 100)) / 100;
};
const sellItem = () => __awaiter(this, void 0, void 0, function* () {
    const button = getInventoryElementById("item_market_actions", "class").find("a")[1];
    button.click((e) => e.preventDefault());
    console.log(modifierValue, modifierType);
    const value = calculateValue(modifierValue, modifierType, productDetail.value);
    yield sleep(1000);
    document.getElementById("market_sell_buyercurrency_input").value = value;
    document.getElementById("market_sell_buyercurrency_input").focus();
    document.getElementById("market_sell_dialog_accept_ssa").checked = true;
});
const getProductDetails = () => __awaiter(this, void 0, void 0, function* () {
    const href = document
        .getElementsByClassName("item_market_actions")[0]
        //@ts-ignore
        .getElementsBySelector("a")[0].href;
    const splitedUrl = href.split("/");
    const productName = splitedUrl[splitedUrl.length - 1];
    const appId = splitedUrl[splitedUrl.length - 2];
    const productId = yield getCurrentMarketItemNameId(appId, productName);
    const histogram = yield getCurrentItemOrdersHistogram(productId);
    const lowest_sell_order = histogram.lowest_sell_order;
    return {
        id: productId,
        name: productName,
        value: lowest_sell_order,
    };
});
const updateProductDetails = (productDetail) => {
    getMarketElementById(idsMap.productId).textContent = productDetail.id;
    getMarketElementById(idsMap.productName).textContent = productDetail.name;
    getMarketElementById(idsMap.productValue).textContent = productDetail.value;
};
const initializeControlPanel = () => __awaiter(this, void 0, void 0, function* () {
    const selector = "#global_header";
    const isFixed = modifierType === ModifierType.Fixed;
    $(selector).append(`<div id="container22" style="background: #8F98A0; position: absolute; z-index: 9999; top: 10px; right: 10px; width: 200px; height: 300px; color: #000;">
      <div style="display: flex; flex-direction: column;">
        <span >Product Details </span>
        <span >Id: <span id="${idsMap.productId}">N/A</span><span>
        <span >Name: <span id="${idsMap.productName}">N/A</span><span>
        <span >Value: <span id="${idsMap.productValue}">N/A</span><span>

        <div id="types">
          <input type="radio" id="${idsMap.modifyTypeFixed}" name="type" value="fixed" ${isFixed ? "checked='true'" : ""}"> fixed
          <input type="radio" id="${idsMap.modifyTypePercent}" name="type" value="percent" ${isFixed ? "" : "checked='true'"}> percent
        </div>
        <label for="${idsMap.modifyInput}"/> Modifier </label>
        <input id="${idsMap.modifyInput}" value="${modifierValue}" />
        <input id="${idsMap.modifyButton}" type="button" value="Submit"/>
        <input id="${idsMap.sellItem}" type="button" value="Click"/>
      </div>
    </div>`);
    $("#container22").click(function (event) {
        event.stopPropagation();
    });
    document.getElementById(idsMap.modifyButton).addEventListener("click", () => {
        const isFixed = document.getElementById(idsMap.modifyTypeFixed)
            .checked;
        const value = document.getElementById(idsMap.modifyInput).value;
        localStorage.setItem(localStorageMap.isFixed, isFixed);
        localStorage.setItem(localStorageMap.value, value);
    });
});
const initializeStriptEvents = () => {
    const ProductButton = $(document.getElementById("inventories"));
    $(ProductButton).on("click", () => __awaiter(this, void 0, void 0, function* () {
        productDetail = yield getProductDetails();
        updateProductDetails(productDetail);
    }));
    const sellItemButton = getMarketElementById(idsMap.sellItem);
    $(sellItemButton).on("click", (e) => __awaiter(this, void 0, void 0, function* () {
        sellItem();
    }));
};
const initializeVariables = () => {
    modifierValue = localStorage.getItem(localStorageMap.value) || "";
    const isFixedLocalStorage = localStorage.getItem(localStorageMap.isFixed);
    modifierType =
        isFixedLocalStorage === "true" || isFixedLocalStorage === null
            ? ModifierType.Fixed
            : ModifierType.Percent;
};
const initializeMarketEvents = () => {
    initializeControlPanel();
};
const initializeInventoryEvents = () => {
    initializeStriptEvents();
};
const isUserLogged = () => (typeof unsafeWindow.g_rgWalletInfo !== "undefined" &&
    unsafeWindow.g_rgWalletInfo != null) ||
    (typeof unsafeWindow.g_bLoggedIn !== "undefined" && unsafeWindow.g_bLoggedIn);
(function ($, async) {
    $(document).ready(function () {
        if (!isUserLogged())
            return;
        currentPage = document.location.pathname.includes("market")
            ? pages.Market
            : pages.Inventory;
        initializeVariables();
        if (currentPage === pages.Market)
            initializeMarketEvents();
        if (currentPage === pages.Inventory)
            initializeInventoryEvents();
        // if (window.location.host === "steamcommunity.com") initializeScript();
    });
    //@ts-ignore
})(jQuery, async);
//# sourceMappingURL=quick-sell.js.map