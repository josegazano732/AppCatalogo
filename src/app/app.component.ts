import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isHolowatyRoute = false;

  constructor(private readonly router: Router) {
    this.syncRouteState(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.syncRouteState(event.urlAfterRedirects);
      });
  }

  private syncRouteState(url: string): void {
    this.isHolowatyRoute = url.includes('/holowaty');
  }
}
