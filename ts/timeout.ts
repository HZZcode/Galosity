class TimeoutSchedule {
    id: NodeJS.Timeout;
    lifespan: number; // how many times of `clear` is required to really clear it

    constructor(id: NodeJS.Timeout, lifespan: number) {
        this.id = id;
        this.lifespan = lifespan;
    }
}

export class TimeoutManager {
    schedules: TimeoutSchedule[];

    constructor() {
        this.schedules = [];
    }

    set(callback: () => void, delay: number, lifespan: number = 1): NodeJS.Timeout {
        const id = setTimeout(callback, delay);
        this.schedules.push(new TimeoutSchedule(id, lifespan));
        return id;
    }

    clear(): void {
        this.schedules.forEach(schedule => {
            schedule.lifespan--;
            if (schedule.lifespan <= 0) clearTimeout(schedule.id);
        });
        this.schedules = this.schedules.filter(schedule => schedule.lifespan > 0);
    }
}
