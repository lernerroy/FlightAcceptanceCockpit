sap.ui.define([
		"fts/cockpit/controller/BaseController"
	], function (BaseController) {
		"use strict";

		return BaseController.extend("fts.cockpit.controller.NotFound", {

			/**
			 * Navigates to the worklist when the link is pressed
			 * @public
			 */
			onLinkPressed : function () {
				this.getRouter().navTo("worklist");
			}

		});

	}
);