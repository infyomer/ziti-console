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

import { DataTableFilterService } from "../features/data-table/data-table-filter.service";
import { ListPageServiceClass } from "./list-page-service.class";
import { inject, Injectable } from "@angular/core";
import { Subscription } from "rxjs";
import { ConsoleEventsService } from "../services/console-events.service";
import { ConfirmComponent } from "../features/confirm/confirm.component";
import { MatDialog } from "@angular/material/dialog";
import { defer } from "lodash";
import { ExtensionService } from "../features/extendable/extensions-noop.service";
import { GrowlerService } from "../features/messaging/growler.service";
import { GrowlerModel } from "../features/messaging/growler.model";

@Injectable()
export abstract class ListPageComponent {
  abstract title: string;
  abstract tabs: { url: string, label: string }[];
  abstract headerActionClicked(action: string): void;
  abstract tableAction(event: { action: string, item: any }): void;
  abstract isLoading: boolean;
  abstract closeModal(event?: any): void;

  // Initializations
  startCount = '-';
  endCount = '-';
  totalCount = '-';
  itemsSelected = false;
  selectedItems: any[] = [];
  columnDefs: any = [];
  rowData: any[] = [];
  filterApplied = false;
  dialogRef: any;
  modalOpen = false;
  gridObj: any = {};
  
  // RxJS subscription handler
  subscription: Subscription = new Subscription();
  private growlerSvc = inject(GrowlerService);

  // Constructor
  constructor(
    protected filterService: DataTableFilterService,
    public svc: ListPageServiceClass,
    protected consoleEvents: ConsoleEventsService,
    protected dialogForm: MatDialog,
    protected extensionService?: ExtensionService
  ) {}

  // ngOnInit: Initialize component and handle subscriptions
  ngOnInit() {
    this.filterService.currentPage = 1;
    this.svc.sideModalOpen = false;
    this.svc.refreshData = this.refreshData.bind(this);
    this.columnDefs = this.svc.initTableColumns();
    this.filterService.clearFilters();
    this.extensionService?.extendOnInit();
    
    this.setupSubscriptions();
  }

  // Setup necessary subscriptions
  private setupSubscriptions() {
    this.subscription.add(
      this.filterService.filtersChanged.subscribe(filters => {
        this.filterApplied = filters && filters.length > 0;
        this.refreshData();
      })
    );
    
    this.subscription.add(
      this.filterService.pageChanged.subscribe(() => {
        this.refreshData();
      })
    );
    
    this.subscription.add(
      this.consoleEvents.closeSideModal.subscribe(() => {
        this.closeModal();
      })
    );
    
    this.subscription.add(
      this.consoleEvents.refreshData.subscribe(() => {
        this.refreshData();
      })
    );
    
    this.consoleEvents.enableZACEvents();
  }

  // ngOnDestroy: Cleanup subscriptions
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  // Toggle item selection
  itemToggled(item: any): void {
    this.updateSelectedItems(item);
  }

  // Update selected items
  updateSelectedItems(toggledItem?: any) {
    let itemSelected = false;
    this.selectedItems = [];
    this.rowData.forEach((item) => {
      if (toggledItem?.id && toggledItem?.id === item?.id) {
        item.selected = toggledItem.selected;
      }
      if (item.selected) {
        itemSelected = true;
        this.selectedItems.push(item);
      }
    });
    this.itemsSelected = itemSelected;
  }

  // Refresh data method
  refreshData(sort?: { sortBy: string, ordering: string }, hardRefresh = false): void {
    this.isLoading = true;
    sort = sort || this.svc.currentSort;
    
    this.svc.getData(this.filterService.filters, sort, this.filterService.currentPage)
      .then((data: any) => {
        this.rowData = data.data;
        this.updatePagination(data.meta.pagination);
        this.updateSelectedItems();
        this.refreshCells();
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  // Helper method to update pagination
  private updatePagination(paginationMeta: any) {
    this.totalCount = paginationMeta.totalCount;
    this.startCount = paginationMeta.offset + 1;
    this.endCount = (this.startCount + paginationMeta.limit > this.totalCount) 
      ? this.totalCount 
      : this.startCount + paginationMeta.limit;
  }

  // Download all items method
  protected downloadAllItems() {
    this.isLoading = true;
    this.svc.downloadAllItems().then(() => {
      this.showGrowler('success', 'Download Finished', 'The requested items have been downloaded');
    }).catch(() => {
      this.showGrowler('error', 'Download Failed', 'Failed to retrieve items for download');
    }).finally(() => {
      this.isLoading = false;
    });
  }

  // Show growler message for success or error
  private showGrowler(type: string, title: string, message: string) {
    const growlerData = new GrowlerModel(type, title, message, message);
    this.growlerSvc.show(growlerData);
  }

  // Open bulk delete confirmation modal
  protected openBulkDelete(selectedItems: any[], entityTypeLabel = 'item(s)') {
    const selectedIds = selectedItems.map(row => row.id);
    const selectedNames = selectedItems.map(item => item.name);
    const countLabel = selectedItems.length > 1 ? selectedItems.length : '';
    
    const data = {
      appendId: 'DeleteServices',
      title: 'Delete',
      message: `Are you sure you would like to delete the following ${countLabel} ${entityTypeLabel}?`,
      bulletList: selectedNames,
      confirmLabel: 'Yes',
      cancelLabel: 'Oops, no get me out of here',
      imageUrl: '../../assets/svgs/Confirm_Trash.svg',
      showCancelLink: true
    };

    this.dialogRef = this.dialogForm.open(ConfirmComponent, {
      data: data,
      autoFocus: false,
    });

    this.dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmed) {
        this.svc.removeItems(selectedIds).then(() => {
          this.refreshData(this.svc.currentSort);
        });
      }
    });
  }

  // Grid ready event handler
  gridReady(event) {
    this.gridObj = event;
  }

  // Refresh grid cells
  refreshCells() {
    defer(() => {
      const params = { force: true };
      this.gridObj?.api?.refreshCells(params);
    });
  }
}
