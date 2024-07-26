/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {ListPageComponent} from "../../shared/list-page-component.class";
import {DataTableFilterService} from "../../features/data-table/data-table-filter.service";
import {MatDialog} from "@angular/material/dialog";
import {TabNameService} from "../../services/tab-name.service";
import {ConsoleEventsService} from "../../services/console-events.service";
import {ZAC_WRAPPER_SERVICE, ZacWrapperServiceClass} from "../../features/wrappers/zac-wrapper-service.class";
import {EdgeRouterPoliciesPageService} from "./edge-router-policies-page.service";

@Component({
  selector: 'lib-edge-router-policies-page',
  templateUrl: './edge-router-policies-page.component.html',
  styleUrls: ['./edge-router-policies-page.component.scss']
})
export class EdgeRouterPoliciesPageComponent extends ListPageComponent implements OnInit, OnDestroy  {

  routerRoleAttributes: any[] = [];
  identityRoleAttributes: any[] = [];
  formDataChanged = false;
  isLoading: boolean;
  tabs: { url: string; label: string }[];
  title = 'Manage Edge Router Policies';

  constructor(
      public override svc: EdgeRouterPoliciesPageService,
      filterService: DataTableFilterService,
      dialogForm: MatDialog,
      private tabNames: TabNameService,
      consoleEvents: ConsoleEventsService,
      @Inject(ZAC_WRAPPER_SERVICE)private zacWrapperService: ZacWrapperServiceClass,
  ) {
    super(filterService, svc, consoleEvents, dialogForm);
    let userLang = navigator.language || 'en-us';
    userLang = userLang.toLowerCase();
  }

  override ngOnInit() {
    super.ngOnInit();
    this.getRoleAttributes();
    this.tabs = this.tabNames.getTabs('policies');
  }

  headerActionClicked(action: string) {
    switch(action) {
      case 'add':
        this.svc.serviceType = '';
        this.svc.openEditForm();
        break;
      case 'edit':
        this.svc.openEditForm();
        break;
      case 'delete':
        const selectedItems = this.rowData.filter((row) => {
          return row.selected;
        });
        const label = selectedItems.length > 1 ? 'services' : 'edge router';
        this.openBulkDelete(selectedItems, label);
        break;
      default:
    }
  }

  tableAction(event: any) {
    switch(event?.action) {
      case 'toggleAll':
      case 'toggleItem':
        this.itemToggled(event.item)
        break;
      case 'update':
        this.svc.serviceType = 'advanced';
        this.svc.openEditForm(event.item.id);
        break;
      case 'create':
        this.svc.openEditForm();
        break;
      case 'delete':
        this.deleteItem(event.item)
        break;
      case 'download-all':
        this.svc.downloadAllItems();
        break;
      case 'download-selected':
        this.svc.downloadItems(this.selectedItems);
        break;
      default:
        break;
    }
  }

  getRoleAttributes() {
    this.svc.getEdgeRouterRoleAttributes().then((result: any) => {
      this.routerRoleAttributes = result.data;
    });
    this.svc.getIdentityRoleAttributes().then((result: any) => {
      this.identityRoleAttributes = result.data;
    });
    this.svc.getServiceNamedAttributes();
    this.svc.getIdentityNamedAttributes();
    this.svc.getPostureNamedAttributes();
  }

  deleteItem(item: any) {
    this.openBulkDelete([item], 'edge-router-policies');
  }

  closeModal(event: any) {
    this.svc.sideModalOpen = false;
    if(event?.refresh) {
      this.refreshData();
    }
  }

  dataChanged(event) {
    this.formDataChanged = event;
  }

  serviceTypeSelected(event) {
    this.svc.serviceType = event;
  }

}
