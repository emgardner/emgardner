---
title: Timers in embedded Rust
hero: ./Background.jpg
thumbnail: ./Thumbnail.png
description: How to use timer's in embedded rust
tags:
  - rust
  - embedded
  - stm32
  - microcontrollers
date: 01-21-2022
draft: false
---

# Getting started with timer's in embedded rust

Timer's are used frequently in embedded projects, this post is about understanding how to setup and use timer's in rust. In my last post i showed how to use the **SYST** peripheral to get a **Delay** timer and went over a basic project setup. For a quick review here is the how it looks.

```rust
#![no_std]
#![no_main]

use cortex_m_rt::entry;
use panic_halt as _;
use stm32l4xx_hal::{delay::Delay, pac, prelude::*};

#[entry]
fn main() -> ! {
    // Get a singleton to the peripherals of our device
    let p = pac::Peripherals::take().unwrap();
    // Get a singleton to the CorePeripherals of our device. CorePeripherals differ from Peripherals
    // the CorePeripherals are common to the cortex-m family.
    let cp = stm32l4xx_hal::device::CorePeripherals::take().unwrap();
    // From my understanding the constrain method works to provide different methods from the HAL on each of it's members
    let mut flash = p.FLASH.constrain();
    // Acquire clock control handle
    let mut rcc = p.RCC.constrain();
    // Acquire power control handle
    let mut pwr = p.PWR.constrain(&mut rcc.apb1r1);
    // Set the system clock and the peripheral clocks and enables them via freeze.
    let clocks = rcc
        .cfgr
        .sysclk(80.MHz())
        .pclk1(80.MHz())
        .pclk2(80.MHz())
        .freeze(&mut flash.acr, &mut pwr);
    // On our board the LED is tied to the PA5 pin. So we will need to get access to the GPIO A bank
    // The registers for GPIO A are controlled by the AHB2 (Advanced High-performance Bus 2)
    let mut gpioa = p.GPIOA.split(&mut rcc.ahb2);
    // We configure the user_led to be a push pull output.
    let mut user_led = gpioa.pa5.into_push_pull_output(&mut gpioa.moder, &mut gpioa.otyper);
    // We create a delay timer using the SYST peripheral
    let mut timer = Delay::new(cp.SYST, clocks);
    loop {
        // We use the Toggleable trait to turn on and off the led
        user_led.toggle();
        // We delay for 500ms
        timer.delay_ms(500_u16);
        // Repeat
    }
}
```

## A simple Delay timer

Now let's implement the **Delay** timer functionality ourselves so that we can see how it works. Timer's work by incrementing a value at each of their clock cycles. We can control a few things with how the timer works. We can control how frequently the value is updated using the **PRESCALER** which will divide the clock down, and we can also control when the **COUNTER/PRELOAD** will overflow.

The equation for the frequency of the interrupt is:

**(1/Freq) = (COUNTER \* PRESCALER)/(CLOCK SPEED)**

Knowing this let's look at our **SYST** struct and see what methods we can use to accomplish this. We will attempt to implement a timer that takes a delay in **ms**.

```rust
    // Get mutable reference to the SYST peripheral
    let mut syst = cp.SYST;
    // Set the clock source to the internal clock
    syst.set_clock_source(cortex_m::peripheral::syst::SystClkSource::Core);
    // Set the reload period of the timer to be
    syst.set_reload(80_000_000 / 1000);
    // Initialize timer to 0
    syst.clear_current();
    // Enable the timer
    syst.enable_counter();
```

We set the clock source to the internal clock which is running at 80Mhz. We want the counter to overflow each ms so we divide the clock frequency by the desired overflow period. According to our equaton this will give us the following:

**(1/Freq) = ((80,000,000/1,000)) \* 1)/(80,000,000) = 1 Khz**

We then clear the current value so that we start at 0. Then we enable the counter. Now we can modularize this so that we can get a more useful function:

```rust
fn delay(syst: &mut pac::SYST, time: u16) {
    // Initialize timer to 0
    syst.clear_current();
    // Enable the timer
    syst.enable_counter();
    // Set Count
    let mut count = time;
    while count > 0 {
        // Check if overflow occured
        if syst.has_wrapped() {
            count -= 1;
        }
    }
    // Disable the timer
    syst.disable_counter();
}
```

Now we can use our convenience function in our main loop to toggle our LED.

```rust
#![no_std]
#![no_main]

use cortex_m_rt::entry;
use panic_halt as _;
use stm32l4xx_hal::{pac, prelude::*};

fn delay(syst: &mut pac::SYST, time: u16) {
    // Initialize timer to 0
    syst.clear_current();
    // Enable the timer
    syst.enable_counter();
    // Set Count
    let mut count = time;
    while count > 0 {
        // Check if overflow occured
        if syst.has_wrapped() {
            count -= 1;
        }
    }
    // Disable the timer
    syst.disable_counter();
}


#[entry]
fn main() -> ! {
    // Get a singleton to the peripherals of our device
    let p = pac::Peripherals::take().unwrap();
    // Get a singleton to the CorePeripherals of our device. Coreperipherals differ from Peripherals
    // the CorePeripherals are common to the cortex-m family.
    let cp = stm32l4xx_hal::device::CorePeripherals::take().unwrap();
    // From my understanding the constrain method works to provide different methods from the HAL on each of it's members
    let mut flash = p.FLASH.constrain();
    // Acquire clock control handle
    let mut rcc = p.RCC.constrain();
    // Acquire power control handle
    let mut pwr = p.PWR.constrain(&mut rcc.apb1r1);
    // Set the system clock and the peripheral clocks and enables them via freeze.
    let clocks = rcc
        .cfgr
        .sysclk(80.MHz())
        .pclk1(80.MHz())
        .pclk2(80.MHz())
        .freeze(&mut flash.acr, &mut pwr);
    // On our board the LED is tied to the PA5 pin. So we will need to get access to the GPIO A bank
    // The registers for GPIO A are controlled by the AHB2 (Advanced High-performance Bus 2)
    let mut gpioa = p.GPIOA.split(&mut rcc.ahb2);
    // We configure the user_led to be a push pull output.
    let mut user_led = gpioa.pa5.into_push_pull_output(&mut gpioa.moder, &mut gpioa.otyper);
    // Get mutable reference to the SYST peripheral
    let mut syst = cp.SYST;
    // Set the clock source to the internal clock
    syst.set_clock_source(cortex_m::peripheral::syst::SystClkSource::Core);
    // Set the reload period of the timer to be
    syst.set_reload(80_000_000 / 1_000);
    loop {
        // We use the Toggleable trait to turn on and off the led
        user_led.toggle();
        delay(&mut syst, 1);
        // Repeat
    }
}
```

Of course you can always refactor this into a trait that looks more like the **Delay** trait so you can get a nice clean syntax.

## Implementing Timer Interrupts

A simple delay can take you far but soon enough you'll want to start using timer interrupts in your project. Let's look at setting up a timer interrupt and then walk through step by step how it works.

```rust
#![no_std]
#![no_main]

use cortex_m_rt::entry;
use cortex_m::{
    interrupt::{free, Mutex},
    peripheral::{NVIC}
};
use panic_halt as _;
#[allow(unused_imports)]
use stm32l4xx_hal::{
    pac::{self, TIM2},
    interrupt,
    prelude::*,
    gpio::{PushPull, Output, PA5},
    timer::{Timer, Event},
    stm32
};
use core::cell::{RefCell, Cell};
use core::ops::DerefMut;
use core::borrow::BorrowMut;

// Declare a global that we will access inside of our timer interrupt
static LED: Mutex<RefCell<Option<PA5<Output<PushPull>>>>> = Mutex::new(RefCell::new(None));
// Declare a global that we will access inside of our timer interrupt
static TIM: Mutex<RefCell<Option<Timer<TIM2>>>> = Mutex::new(RefCell::new(None));

//Declare the timer interrupt
#[interrupt]
fn TIM2() {
    // Run the critical section code
    free(|cs| {
        // Get LED reference and toggle it
        let mut led_ref = LED.borrow(cs).borrow_mut();
        if let Some(ref mut led) = led_ref.deref_mut() {
            led.toggle();
        }
        // Get the timer refernce and clear then event timeout so it isn't
        // triggered immediately
        let mut tim_ref = TIM.borrow(cs).borrow_mut();
        if let Some(ref mut tim) = tim_ref.deref_mut() {
            tim.clear_interrupt(Event::TimeOut);
        }
    });
}

#[entry]
fn main() -> ! {
    // Get a singleton to the peripherals of our device
    let p = pac::Peripherals::take().unwrap();
    // From my understanding the constrain method works to provide different methods from the HAL on each of it's members
    let mut flash = p.FLASH.constrain();
    // Acquire clock control handle
    let mut rcc = p.RCC.constrain();
    // Acquire power control handle
    let mut pwr = p.PWR.constrain(&mut rcc.apb1r1);
    // Set the system clock and the peripheral clocks and enables them via freeze.
    let clocks = rcc
        .cfgr
        .sysclk(80.MHz())
        .pclk1(80.MHz())
        .pclk2(80.MHz())
        .freeze(&mut flash.acr, &mut pwr);
    // On our board the LED is tied to the PA5 pin. So we will need to get access to the GPIO A bank
    // The registers for GPIO A are controlled by the AHB2 (Advanced High-performance Bus 2)
    let mut gpioa = p.GPIOA.split(&mut rcc.ahb2);
    // We configure the user_led to be a push pull output.
    let mut user_led = gpioa.pa5.into_push_pull_output(&mut gpioa.moder, &mut gpioa.otyper);
    // Unmask the TIM2 interrupt to allow the interrupt to trigger
    unsafe {
        NVIC::unmask(stm32::Interrupt::TIM2);
    }
    // Setup a timer
    let mut timer = Timer::tim2(p.TIM2, 5.Hz(), clocks, &mut rcc.apb1r1);
    // Listen for the timeout (overflow) event
    timer.listen(Event::TimeOut);
    // Place the references into their global variables
    free(|cs| {
        LED.borrow(cs).replace(Some(user_led));
        TIM.borrow(cs).replace(Some(timer));
    });
    // Do nothing
    loop {
    }
}
```

Not a whole lot has changed here. Lets look at what we added.

```rust
// Declare a global that we will access inside of our timer interrupt
static LED: Mutex<RefCell<Option<PA5<Output<PushPull>>>>> = Mutex::new(RefCell::new(None));
// Declare a global that we will access inside of our timer interrupt
static TIM: Mutex<RefCell<Option<Timer<TIM2>>>> = Mutex::new(RefCell::new(None));
```

Here we decalre a global variable we need this in order to access the timer and gpio inside of our interrupt (ok we could use unsafe code but let's just do it the right way).

Next let's look at the interrupt handler:

```rust
//Declare the timer interrupt
#[interrupt]
fn TIM2() {
    // Run the critical section code
    free(|cs| {
        // Get LED reference and toggle it
        let mut led_ref = LED.borrow(cs).borrow_mut();
        if let Some(ref mut led) = led_ref.deref_mut() {
            led.toggle();
        }
        // Get the timer refernce and clear then event timeout so it isn't
        // triggered immediately
        let mut tim_ref = TIM.borrow(cs).borrow_mut();
        if let Some(ref mut tim) = tim_ref.deref_mut() {
            tim.clear_interrupt(Event::TimeOut);
        }
    });
}

```

We decalre the interrupt handler with the **#[interrupt]** attribute. This replaces the default handler for the interrupt with the declared function. We use **free()** to execute a critical section. In a critical section interrupts are disabled and then enabled upon exit. In order to borrow the mutex we must provide it with a **CriticalSection** context. Toggling the LED should be nothing new to you. The timer however may look new, all we will need to do is clear it of it's interrupt event or it will immediately be called again.

Then in our main function you will notice this:

```rust
    // Unmask the TIM2 interrupt to allow the interrupt to trigger
    unsafe {
        NVIC::unmask(stm32::Interrupt::TIM2);
    }
    // Setup a timer
    let mut timer = Timer::tim2(p.TIM2, 5.Hz(), clocks, &mut rcc.apb1r1);
    // Listen for the timeout (overflow) event
    timer.listen(Event::TimeOut);
    // Place the references into their global variables
    free(|cs| {
        LED.borrow(cs).replace(Some(user_led));
        TIM.borrow(cs).replace(Some(timer));
    });
    // Do nothing
    loop {
    }
```

We first unmask the interrupt in the NVIC (Nested Vector Interrupt Controller). We then create the timer using the **TIM2** instance, and we configure the timer to listen for a **TimeOut** event. After this we replace the contents of our global variables with our timer and pin instance and we are in business.

## Lets build our own millis()

If you come from an arduino background you'll be familiar with the **millis()** function, if you're used to the STM32 HAL you'll be familiar with the **HAL_GetTick()** function. Our board crate doesn't come equipped with this function (some crates like the stm32f1xx crate do), but this isn't a problem for us we will create our own version of the **millis()** function, and we've already done most of the work to do it. Let's see what the code will look like:

```rust
#![no_std]
#![no_main]

use cortex_m_rt::entry;
use cortex_m::{
    interrupt::{free, Mutex},
    peripheral::{NVIC}
};
use panic_halt as _;
#[allow(unused_imports)]
use stm32l4xx_hal::{
    pac::{self, TIM2},
    interrupt,
    prelude::*,
    delay::Delay,
    gpio::{Output, PushPull, Pin, PA5},
    stm32,
    timer::{Timer, Event}
};
use core::cell::{RefCell, Cell};
use core::ops::DerefMut;
use core::borrow::BorrowMut;
use core::sync::atomic::{AtomicU32, Ordering};

// Declare a global that we will access inside of our timer interrupt
static TIM: Mutex<RefCell<Option<Timer<TIM2>>>> = Mutex::new(RefCell::new(None));
// Declare global for millis variable
static MILLIS: AtomicU32 = AtomicU32::new(0);


//Declare the timer interrupt
#[interrupt]
fn TIM2() {
    // Run the critical section code
    free(|cs| {
        // Get the timer refernce and clear then event timeout so it isn't
        // triggered immediately
        let mut tim_ref = TIM.borrow(cs).borrow_mut();
        if let Some(ref mut tim) = tim_ref.deref_mut() {
            // Get the timer refernce and clear then event timeout so it isn't
            // triggered immediately
            tim.clear_interrupt(Event::TimeOut);
            // Add one to the millis count
            MILLIS.fetch_add(1, Ordering::SeqCst);
        }
    });

}

fn millis() -> u32 {
    MILLIS.load(Ordering::SeqCst)
}


#[entry]
fn main() -> ! {
    // Get a singleton to the peripherals of our device
    let p = pac::Peripherals::take().unwrap();
    // From my understanding the constrain method works to provide different methods from the HAL on each of it's members
    let mut flash = p.FLASH.constrain();
    // Acquire clock control handle
    let mut rcc = p.RCC.constrain();
    // Acquire power control handle
    let mut pwr = p.PWR.constrain(&mut rcc.apb1r1);
    // Set the system clock and the peripheral clocks and enables them via freeze.
    let clocks = rcc
        .cfgr
        .sysclk(80.MHz())
        .pclk1(80.MHz())
        .pclk2(80.MHz())
        .freeze(&mut flash.acr, &mut pwr);
    // On our board the LED is tied to the PA5 pin. So we will need to get access to the GPIO A bank
    // The registers for GPIO A are controlled by the AHB2 (Advanced High-performance Bus 2)
    let mut gpioa = p.GPIOA.split(&mut rcc.ahb2);
    // We configure the user_led to be a push pull output.
    let mut user_led = gpioa.pa5.into_push_pull_output(&mut gpioa.moder, &mut gpioa.otyper);
    // Unmask the TIM2 interrupt to allow the interrupt to trigger
    unsafe {
        NVIC::unmask(stm32::Interrupt::TIM2);
    }
    // Setup a timer
    let mut ms_timer = Timer::tim2(p.TIM2, 1000.Hz(), clocks, &mut rcc.apb1r1);
    // Listen for the timeout (overflow) event
    ms_timer.listen(Event::TimeOut);
    // Place the references into their global variables
    free(|cs| {
        TIM.borrow(cs).replace(Some(ms_timer));
    });
    // Get Current time
    let mut timestamp = millis();
    // Set a timeperiod to elapse
    let timeout: u32 = 1000;
    loop {
        if (millis() - timestamp) > timeout {
            user_led.toggle();
            timestamp = millis();
        }
    }
}
```

The only changes we've made are to the timeout frequency changing to **1000Hz** and adding in an **Atomicu32** to keep track of how many time's our counter has overflowed. Using this approach we can run many non timing critical tasks without ever holding up our main loop. I hope this helped showcase how timer's work and how you can use them in your code.
