import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { BookingDuration, calculatePrice, RESOURCE_PRICES } from "@/lib/pricing";
import { useNavigate } from "react-router-dom";

interface BookingFormProps {
  spaceId: string;
  spaceType: string;
  spaceName: string;
}

const RESOURCES = [
  { id: 'projector', label: 'Projector', price: RESOURCE_PRICES.projector },
  { id: 'whiteboard', label: 'Whiteboard', price: RESOURCE_PRICES.whiteboard },
  { id: 'parking', label: 'Parking Spot', price: RESOURCE_PRICES.parking },
  { id: 'lockers', label: 'Storage Locker', price: RESOURCE_PRICES.lockers },
  { id: 'printer', label: 'Printer Access', price: RESOURCE_PRICES.printer },
];

export const BookingForm = ({ spaceId, spaceType, spaceName }: BookingFormProps) => {
  const navigate = useNavigate();
  const [duration, setDuration] = useState<BookingDuration>('hourly');
  const [date, setDate] = useState<Date>();
  const [hours, setHours] = useState(1);
  const [startHour, setStartHour] = useState(9);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [userName, setUserName] = useState('');
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  useEffect(() => {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const spaceBookings = bookings.filter((booking: any) => booking.spaceId === spaceId);
    setExistingBookings(spaceBookings);
  }, [spaceId]);

  // Get booked hours for a specific date
  const getBookedHoursForDate = (checkDate: Date) => {
    const bookedHours: number[] = [];
    existingBookings.forEach((booking: any) => {
      const bookingDate = new Date(booking.date);
      if (isSameDay(bookingDate, checkDate)) {
        if (booking.duration === 'hourly') {
          // Add all hours in the booking range
          for (let i = 0; i < booking.hours; i++) {
            bookedHours.push(booking.startHour + i);
          }
        } else {
          // Daily or monthly bookings take the entire day
          for (let i = 0; i < 24; i++) {
            bookedHours.push(i);
          }
        }
      }
    });
    return bookedHours;
  };

  // Check if a date should be disabled (only if fully booked or has daily/monthly booking)
  const isDateDisabled = (checkDate: Date) => {
    if (checkDate < new Date(new Date().setHours(0, 0, 0, 0))) return true;
    
    const bookedHours = getBookedHoursForDate(checkDate);
    // Disable if all 24 hours are booked or if there's a daily/monthly booking
    return bookedHours.length >= 24;
  };

  // Get available hours for the selected date
  const getAvailableHours = () => {
    if (!date) return Array.from({ length: 24 }, (_, i) => i);
    
    const bookedHours = getBookedHoursForDate(date);
    return Array.from({ length: 24 }, (_, i) => i).filter(hour => !bookedHours.includes(hour));
  };

  const totalPrice = calculatePrice(
    spaceType,
    duration,
    hours,
    selectedResources,
    startHour
  );

  const handleResourceToggle = (resourceId: string) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const handleBooking = () => {
    if (!date || !userName.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const booking = {
      spaceId,
      spaceName,
      duration,
      date: date.toISOString(),
      hours,
      startHour,
      resources: selectedResources,
      totalPrice,
      userName,
      bookingId: Date.now().toString(),
    };

    const existingBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    localStorage.setItem('bookings', JSON.stringify([...existingBookings, booking]));
    
    navigate(`/booking-confirmation/${booking.bookingId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book Your Space</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Your Name</Label>
          <Input
            id="name"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <Label>Booking Duration</Label>
          <RadioGroup value={duration} onValueChange={(val) => setDuration(val as BookingDuration)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hourly" id="hourly" />
              <Label htmlFor="hourly" className="cursor-pointer">Hourly</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daily" id="daily" />
              <Label htmlFor="daily" className="cursor-pointer">Daily</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monthly" id="monthly" />
              <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Select Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                disabled={isDateDisabled}
              />
            </PopoverContent>
          </Popover>
        </div>

        {duration === 'hourly' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="hours">Number of Hours</Label>
              <Input
                id="hours"
                type="number"
                min="1"
                max="24"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-hour">Start Time (Hour)</Label>
              <select
                id="start-hour"
                value={startHour}
                onChange={(e) => setStartHour(parseInt(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {getAvailableHours().map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}:00 - {hour + 1}:00 {hour >= 9 && hour <= 17 ? '(Peak)' : ''}
                  </option>
                ))}
              </select>
              {startHour >= 9 && startHour <= 17 && (
                <p className="text-xs text-accent">Peak hours - 30% premium</p>
              )}
              {date && getAvailableHours().length === 0 && (
                <p className="text-xs text-destructive">No available hours for this date</p>
              )}
            </div>
          </>
        )}

        <div className="space-y-3">
          <Label>Additional Resources</Label>
          {RESOURCES.map((resource) => (
            <div key={resource.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={resource.id}
                  checked={selectedResources.includes(resource.id)}
                  onCheckedChange={() => handleResourceToggle(resource.id)}
                />
                <Label htmlFor={resource.id} className="cursor-pointer">
                  {resource.label}
                </Label>
              </div>
              <span className="text-sm text-muted-foreground">+${resource.price}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total Price:</span>
            <span className="text-primary">${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        <Button 
          onClick={handleBooking}
          className="w-full bg-gradient-to-r from-accent to-accent/90 hover:shadow-lg"
          size="lg"
        >
          Confirm Booking
        </Button>
      </CardContent>
    </Card>
  );
};
