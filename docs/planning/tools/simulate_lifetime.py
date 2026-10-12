"""Offline balance experiment; does not modify the game or Supabase.

Run: python3 docs/planning/tools/simulate_lifetime.py
Amounts are fictional money units. Health uses hundredths of a point.
"""
import json
from dataclasses import dataclass, field

DAYS = 82 * 365
JOBS = {
    "begging": (15, 0, 1), "newspaper": (60, 1, 1),
    "courier": (140, 2, 2), "freelancer": (260, 1, 3),
    "mechanic": (350, 2, 2), "specialist": (650, 2, 3),
    "master": (1050, 2, 3), "junior": (550, 1, 3),
    "engineer": (900, 1, 4), "senior": (1450, 1, 4),
    "analyst": (520, 1, 3), "manager": (850, 1, 4),
    "executive": (1400, 1, 5),
}


def age_rules(age):
    if age < 40:
        return 4, 0
    if age < 60:
        return 5, 5
    if age < 75:
        return 6, 15
    if age < 90:
        return 7, 30
    return 8, 50


@dataclass
class Life:
    route: str
    begging_reward: int = 15
    wants: tuple = ()
    money: int = 0
    earned: int = 0
    spent: int = 0
    hunger: int = 100
    sanity: int = 100
    health: int = 10000
    day: int = 0
    job: str = "begging"
    study: int = 0
    enrolled: bool = False
    graduated: bool = False
    qualified_work: int = 0
    counts: dict = field(default_factory=lambda: {k: 0 for k in ("work", "eat", "rest", "study")})
    milestones: dict = field(default_factory=dict)
    bands: dict = field(default_factory=dict)
    wants_index: int = 0

    @property
    def age(self):
        return 18 + self.day // 365

    def buy(self, amount, label):
        # Reserve protects survival from a newly purchased unlock.
        if self.money < amount + 200:
            return False
        self.money -= amount
        self.spent += amount
        self.milestones[label] = round(18 + self.day / 365, 2)
        return True

    def progression(self):
        if self.route == "begging":
            return
        if self.job == "begging" and self.buy(2500, "bike"):
            self.job = "newspaper"
        if self.job == "newspaper" and self.buy(10000, "delivery_kit"):
            self.job = "courier"
        if self.route == "courier":
            return
        if self.route != "trades" and self.job == "courier" and self.buy(45000, "laptop"):
            self.job = "freelancer"
        tuition = {"technology": 180000, "business": 160000, "trades": 25000}[self.route]
        if self.route == "trades" and self.job == "courier" and "trade_tools" not in self.milestones:
            self.buy(15000, "trade_tools")
        ready = self.job == "freelancer" if self.route != "trades" else "trade_tools" in self.milestones
        if ready and not self.enrolled and self.buy(tuition, "enrolled"):
            self.enrolled = True
        if self.graduated:
            if self.route == "technology":
                self.job = "senior" if self.qualified_work >= 4500 else "engineer" if self.qualified_work >= 1500 else "junior"
            elif self.route == "business":
                self.job = "executive" if self.qualified_work >= 4500 else "manager" if self.qualified_work >= 1500 else "analyst"
            else:
                self.job = "master" if self.qualified_work >= 3000 else "specialist" if self.qualified_work >= 1000 else "mechanic"
            self.milestones.setdefault(self.job, round(18 + self.day / 365, 2))
        if self.graduated and self.wants_index < len(self.wants):
            label, price = self.wants[self.wants_index]
            if self.buy(price, label):
                self.wants_index += 1

    def step(self):
        basal, aging = age_rules(self.age)
        _, strain, sanity_cost = JOBS[self.job]
        sick = self.health < 4000
        # Predict worst hunger cost for the next work/study action.
        danger_cost = basal + max(strain, 1) + int(sick)
        action = "work"
        if self.hunger <= danger_cost + 8:
            action = "eat"
        elif self.sanity < 55 or self.health < 5500:
            action = "rest"
        elif self.enrolled and not self.graduated and (self.counts["work"] + self.counts["study"]) % 2 == 0:
            action = "study"

        band = "18–39" if self.age < 40 else "40–59" if self.age < 60 else "60–74" if self.age < 75 else "75–89" if self.age < 90 else "90–99"
        b = self.bands.setdefault(band, {"days": 0, "work": 0, "eat": 0, "rest": 0, "study": 0, "food_spend": 0})
        b["days"] += 1
        b[action] += 1
        self.counts[action] += 1
        if action == "eat":
            price, restore = (100, 80) if self.money >= 100 else (25, 25)
            if self.money < price:
                raise RuntimeError(f"Food unaffordable: {self.route}, age {self.age}")
            self.money -= price
            self.spent += price
            b["food_spend"] += price
            self.hunger = min(100, self.hunger - basal + restore)
        elif action == "rest":
            self.hunger -= (basal + 1) // 2 + int(sick)
            self.sanity = min(100, self.sanity + 25)
            self.health = min(10000, self.health + 400)
        elif action == "study":
            self.hunger -= basal + 1 + int(sick)
            self.sanity = max(0, self.sanity - 2)
            self.study += 1
            needed = 120 if self.route == "trades" else 1460
            if self.study == needed:
                self.graduated = True
                self.milestones["graduated"] = round(18 + (self.day + 1) / 365, 2)
        else:
            reward = self.begging_reward if self.job == "begging" else JOBS[self.job][0]
            sanity_factor = 100 if self.sanity >= 50 else 80 if self.sanity >= 20 else 60
            health_factor = 100 if self.health >= 4000 else 85 if self.health >= 2000 else 70
            earned = max(1, reward * sanity_factor * health_factor // 10000)
            self.money += earned
            self.earned += earned
            self.hunger -= basal + strain + int(sick)
            self.sanity = max(0, self.sanity - sanity_cost)
            if self.graduated:
                self.qualified_work += 1
        self.health = max(0, self.health - aging)
        self.day += 1
        if self.hunger <= 0:
            raise RuntimeError(f"Policy died: {self.route}, age {self.age}")

    def run(self):
        while self.day < DAYS:
            self.progression()
            self.step()
        assert sum(self.counts.values()) == DAYS
        assert self.earned - self.spent == self.money
        return {"route": self.route, "begging_reward": self.begging_reward, "days": self.day,
                "end_age": self.age, "gross": self.earned, "spent": self.spent,
                "final_wallet": self.money, "counts": self.counts,
                "milestone_ages": self.milestones, "age_bands": self.bands}


if __name__ == "__main__":
    results = [Life(route).run() for route in ("begging", "courier", "technology", "business", "trades")]
    results.append(Life("technology", begging_reward=12).run())
    results.append(Life("begging", begging_reward=12).run())
    results.append(Life("technology", wants=(("first_house", 600000), ("sedan", 180000),
                    ("villa", 4000000), ("luxury_car", 1200000), ("private_jet", 15000000))).run())
    print(json.dumps(results, indent=2))
