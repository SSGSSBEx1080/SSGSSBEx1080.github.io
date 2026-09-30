/* №24 · исходники advancements/24_scooter; критерии предметов и серверной скорости. */
window.ZM=window.ZM||{};
ZM.P24={advancements:[
 {key:"scooter_craft",title:"МТС Юрент",color:"e",frame:"task",xp:10,icon:"scooter",desc:"Получи электрический самокат",how:"В игре получить предмет scooter в инвентарь. В демонстрации — нажать «Взять самокат»."},
 {key:"find_station",title:"Бензина нет",color:"e",frame:"goal",xp:20,icon:"station",free:true,desc:"Получи зарядный порт",how:"Триггер в исходном advancement — charging_port в инвентаре, а не фактическая зарядка. В демонстрации — «Получить порт»."},
 {key:"speed_100",title:"320 км/ч peek",color:"5",frame:"challenge",xp:100,icon:"speed",free:true,desc:"Разгон до 100 км/ч по спидометру",how:"Название говорит о 320 км/ч, но серверный код выдаёт награду при показании HUD не меньше 99,5 км/ч. Ровная дорога ограничена 80: ищи спуск."},
]};
