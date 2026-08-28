import { Component } from '@angular/core';
import { RouterModule, RouterOutlet} from "@angular/router";
import {CommonModule} from "@angular/common";

import {MenubarModule} from "primeng/menubar";

@Component({
  selector: 'app-operation',
  template: `
    <div>
      
      <div class="">
        <router-outlet />
      </div>
    </div>
  `,
  imports: [CommonModule, MenubarModule, RouterModule, RouterOutlet],
  styleUrl: './operation.component.css',
})
export class OperationComponent {

 
}
