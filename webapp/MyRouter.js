sap.ui.define([
	"sap/m/routing/RouteMatchedHandler",
	"sap/ui/core/routing/History",
	"sap/ui/core/routing/Router",
	"sap/ui/core/mvc/View"
], function(RouteMatchedHandler, History, Router, View) {
	"use strict";

	return Router.extend("com.sd.price.sim.MyRouter", {

		/**
		 * constructor
		 */
		constructor: function() {
			Router.apply(this, arguments);
			this._oRouteMatchedHandler = new RouteMatchedHandler(this);
		},

		/**
		 * navigates to a specific route
		 * param{String} sRoute name of the route
		 * param{Object} mData parameters for the route
		 */
		myNavBack: function(sRoute, mData) {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();

			//The history contains a previous entry
			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var bReplace = true; // otherwise we go backwards with a forward history
				this.navTo(sRoute, mData, bReplace);
			}
		},

		/**
		 * Changes the view without changing the hash
		 * @param {object} oOptions must have the following properties
		 * <ul>
		 * 	<li> currentView : the view you start the navigation from.</li>
		 * 	<li> targetViewName : the fully qualified name of the view you want to navigate to.</li>
		 * 	<li> targetViewType : the viewtype eg: XML</li>
		 * 	<li> isMaster : default is false, true if the view should be put in the master</li>
		 * 	<li> transition : default is "show", the navigation transition</li>
		 * 	<li> data : the data passed to the navContainers livecycle events</li>
		 * </ul>
		 * @public
		 */
		myNavToWithoutHash: function(oOptions) {
			var oSplitApp = this._findSplitApp(oOptions.currentView);

			// Load view, add it to the page aggregation, and navigate to it
			var oView = this.getView(oOptions.targetViewName, oOptions.targetViewType);
			oSplitApp.addPage(oView, oOptions.isMaster);
			oSplitApp.to(oView.getId(), "slide", oOptions.data);
		},

		/*
		backWithoutHash : function (oCurrentView, bIsMaster) {
			var sBackMethod = bIsMaster ? "backMaster" : "backDetail";
			this._findSplitApp(oCurrentView)[sBackMethod]();
		},
		*/
		/**
		 * remove the router
		 */
		destroy: function() {
			Router.prototype.destroy.apply(this, arguments);
			this._oRouteMatchedHandler.destroy();
		},

		/**
		 * get the ancestor view instance
		 * param{Object} oControl current view instance
		 * return{Object}} the ancestor view instance
		 */
		_findSplitApp: function(oControl) {
			var sAncestorControlName = "idAppControl";

			if (oControl instanceof View && oControl.byId(sAncestorControlName)) {
				return oControl.byId(sAncestorControlName);
			}
			return oControl.getParent() ? this._findSplitApp(oControl.getParent(), sAncestorControlName) : null;
		}
	});
});