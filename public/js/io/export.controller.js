(function () {
    'use strict';

    angular.module('app.io').controller('ExportController', ExportController);

    ExportController.$inject = ['FileSaver', 'api'];

    function ExportController (FileSaver, api) {
        const vm = this;

        vm.dashboards = [];
        vm.downloadExport = downloadExport;
        vm.exportName = 'export';
        vm.layers = [];
        vm.reports = [];

        activate();

        function activate () {
            api.getLayers().then(data => { vm.layers = data.items; });
            api.getReports().then(data => { vm.reports = data.items; });
            api.getDashboards().then(data => { vm.dashboards = data.items; });
        }

        function downloadExport () {
            const layerIDs = getCheckedIds(vm.layers);
            const reportIDs = getCheckedIds(vm.reports);
            const dashboardIDs = getCheckedIds(vm.dashboards);

            makeExportBundle(dashboardIDs, reportIDs, layerIDs)
                .then(bundle => {
                    const blob = new Blob([JSON.stringify(bundle, null, 2)]);
                    FileSaver.saveAs(blob, vm.exportName + '.json');
                });
        }

        function getCheckedIds (items) {
            return items.filter(i => i.checked).map(i => i._id);
        }

        function makeExportBundle (dashboardIDs, reportIDs, layerIDs) {
            const requiredLayers = new Set();
            const requiredDatasources = new Set();
            const bundle = {};

            for (const layerID of layerIDs) {
                requiredLayers.add(layerID);
            }

            const reportPromise = Promise.all(reportIDs.map(api.getReport))
                .then(reports => {
                    bundle.reports = reports;
                    for (const report of reports) {
                        requiredLayers.add(report.query.layerID);
                    }
                });

            const dashboardPromise = Promise.all(dashboardIDs.map(api.getDashboard))
                .then(dashboards => {
                    bundle.dashboards = dashboards;
                    for (const dashboard of dashboards) {
                        for (const report of dashboard.reports) {
                            requiredLayers.add(report.query.layerID);
                        }
                    }
                });

            return Promise.all([reportPromise, dashboardPromise])
                .then(() => {
                    return Promise.all(Array.from(requiredLayers).map(api.getLayer));
                })
                .then(layers => {
                    bundle.layers = layers;
                    for (const layer of layers) {
                        requiredDatasources.add(layer.datasourceID);
                    }
                })
                .then(() => {
                    return Promise.all(Array.from(requiredDatasources).map(api.getDatasource));
                })
                .then(datasources => {
                    bundle.datasources = datasources;
                })
                .then(() => {
                    return bundle;
                });
        }
    }
})();
