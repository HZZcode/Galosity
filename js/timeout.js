class TimeoutSchedule {
    id;
    lifespan; // how many times of `clear` is required to really clear it
    constructor(id, lifespan) {
        this.id = id;
        this.lifespan = lifespan;
    }
}

export class TimeoutManager {
    schedules = [];

    set(callback, delay, lifespan = 1) {
        const id = setTimeout(callback, delay);
        this.schedules.push(new TimeoutSchedule(id, lifespan));
        return id;
    }

    clear() {
        this.schedules.forEach(schedule => {
            schedule.lifespan--;
            if (schedule.lifespan <= 0) clearTimeout(schedule.id);
        });
        this.schedules = this.schedules.filter(schedule => schedule.lifespan > 0);
    }
}