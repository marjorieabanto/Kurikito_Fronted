import { Routes } from '@angular/router';

export const OPERATION_ROUTES: Routes = [
  {
    path:'',
    loadComponent: () =>
      import('./operation.component').then((c) => c.OperationComponent),
    children: [
      {
        path: '',
        redirectTo: 'list-sell',
        pathMatch: 'full',
      },
      {
        path: 'list-sell',
        loadComponent: () =>
          import('./pages/sellList/sellList.component').then(
            (c) => c.SellListComponent
          ),
      },
      {
        path: 'list-sell/:id',
        loadComponent: () =>
          import('./pages/sellList/pages/sell.information/sell.information.component').then(
            (c) => c.SellInformationComponent
          ),
      },

      
    ]
  }
]
