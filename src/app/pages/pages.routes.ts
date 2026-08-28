import { Routes } from '@angular/router';

import { PagesComponent } from './pages.component';

export const PAGES_ROUTES: Routes = [
  {
    path: '',
    component: PagesComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./home/home.component').then(c => c.HomeComponent),
      },
     
      {
        path: 'operation',
        loadChildren: () =>
          import('./operation/operation.routes').then(c => c.OPERATION_ROUTES),
      },
     

    ],
  },
];
